const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CORE_BASE = path.join(ROOT, "core", "src", "app", "components");
const LOCAL_BASE = path.join(ROOT, "src", "app", "components");

const FLAGS = new Set(process.argv.slice(2));
const STRICT = FLAGS.has("--strict");
const LIST_MISSING = FLAGS.has("--list-missing");

const EXCLUDE_PATTERNS = [
  /\.d\.ts$/,
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
  /\.story\./,
  /\.generated\./,
];

function shouldInclude(filePath) {
  if (!/\.(ts|tsx)$/.test(filePath)) return false;
  return !EXCLUDE_PATTERNS.some((re) => re.test(filePath));
}

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && shouldInclude(fullPath)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function toRel(base, filePath) {
  return path.relative(base, filePath).replace(/\\/g, "/");
}

const coreFiles = walkFiles(CORE_BASE);
const localFiles = walkFiles(LOCAL_BASE);

const localByRel = new Set(localFiles.map((f) => toRel(LOCAL_BASE, f)));
const localByBase = new Map();
for (const file of localFiles) {
  const base = path.basename(file);
  const rel = toRel(LOCAL_BASE, file);
  if (!localByBase.has(base)) localByBase.set(base, []);
  localByBase.get(base).push(rel);
}

const overridden = [];
const missing = [];
const nearMisses = [];

for (const coreFile of coreFiles) {
  const rel = toRel(CORE_BASE, coreFile);
  if (localByRel.has(rel)) {
    overridden.push(rel);
    continue;
  }
  missing.push(rel);
  const base = path.basename(rel);
  if (localByBase.has(base)) {
    nearMisses.push({
      core: rel,
      local: localByBase.get(base),
    });
  }
}

function printHeader() {
  console.log("Component override check");
  console.log(`Core components: ${coreFiles.length}`);
  console.log(`Local components: ${localFiles.length}`);
  console.log(`Overridden: ${overridden.length}`);
  console.log(`Missing: ${missing.length}`);
}

printHeader();

if (overridden.length) {
  console.log("\nOverridden:");
  for (const rel of overridden.sort()) {
    console.log(`  - ${rel}`);
  }
}

if (LIST_MISSING && missing.length) {
  console.log("\nNot overridden:");
  for (const rel of missing.sort()) {
    console.log(`  - ${rel}`);
  }
}

if (nearMisses.length) {
  console.log("\nNear-miss warnings (same filename, different path):");
  for (const item of nearMisses) {
    console.log(`  - core: ${item.core}`);
    for (const localRel of item.local) {
      console.log(`    local: ${localRel}`);
    }
  }
}

if (STRICT && nearMisses.length) {
  console.error("\nStrict mode failed due to near-miss overrides.");
  process.exit(1);
}
