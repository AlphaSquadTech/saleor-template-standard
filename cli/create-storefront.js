#!/usr/bin/env node

"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Colors (ANSI) ───────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

const ok = (msg) => console.log(`${c.green}  ✔${c.reset} ${msg}`);
const info = (msg) => console.log(`${c.cyan}  ℹ${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}  ⚠${c.reset} ${msg}`);
const fail = (msg) => {
  console.error(`${c.red}  ✖ ${msg}${c.reset}`);
  process.exit(1);
};
const step = (n, msg) =>
  console.log(`\n${c.bold}${c.cyan}[${n}]${c.reset} ${c.bold}${msg}${c.reset}`);

// ─── Parse args ──────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.help) {
  console.log(`
${c.bold}create-storefront${c.reset} — Scaffold a new tenant storefront

${c.bold}Usage:${c.reset}
  node cli/create-storefront.js --name <tenant-name> [options]

${c.bold}Options:${c.reset}
  --name          ${c.dim}(required)${c.reset}  Tenant / directory name (e.g. dantes-parts)
  --api-url       ${c.dim}(optional)${c.reset}  Saleor GraphQL endpoint
  --assets-url    ${c.dim}(optional)${c.reset}  Assets base URL
  --template-url  ${c.dim}(optional)${c.reset}  Git URL for the template repo
  --help          Show this message
`);
  process.exit(0);
}

if (!args.name) {
  fail("--name is required. Run with --help for usage.");
}

const TENANT_NAME = args.name;
const API_URL = args["api-url"] || "";
const ASSETS_URL = args["assets-url"] || "";
const TEMPLATE_URL =
  args["template-url"] ||
  "https://github.com/webshopmanager/saleor-template-standard.git";

const TARGET_DIR = path.resolve(process.cwd(), TENANT_NAME);

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: "pipe", ...opts });
  } catch (e) {
    fail(`Command failed: ${cmd}\n${e.stderr ? e.stderr.toString() : e.message}`);
  }
}

// ─── Banner ──────────────────────────────────────────────────────
console.log(`
${c.bold}${c.cyan}┌──────────────────────────────────────┐
│     create-storefront  v1.0.0        │
│  Web Shop Manager Storefront Scaffold │
└──────────────────────────────────────┘${c.reset}
`);
info(`Tenant:   ${c.bold}${TENANT_NAME}${c.reset}`);
if (API_URL) info(`API URL:  ${API_URL}`);
if (ASSETS_URL) info(`Assets:   ${ASSETS_URL}`);
info(`Template: ${TEMPLATE_URL}`);

// ─── Step 1: Clone ───────────────────────────────────────────────
step("1/6", "Cloning template repository…");

if (fs.existsSync(TARGET_DIR)) {
  fail(`Directory "${TENANT_NAME}" already exists.`);
}

run(`git clone "${TEMPLATE_URL}" "${TARGET_DIR}"`);
ok("Template cloned.");

// ─── Step 2: Init submodules ─────────────────────────────────────
step("2/6", "Initializing submodules…");
run("git submodule update --init --recursive", { cwd: TARGET_DIR });
ok("Submodules initialized.");

// ─── Step 3: .env.local ──────────────────────────────────────────
step("3/6", "Creating .env.local…");

const envExamplePath = path.join(TARGET_DIR, ".env.example");
let envContent = "";
if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, "utf8");
} else {
  warn(".env.example not found — creating minimal .env.local");
  envContent = [
    'NEXT_PUBLIC_API_URL=""',
    'NEXT_PUBLIC_ASSETS_BASE_URL=""',
    `NEXT_PUBLIC_TENANT_NAME=""`,
    'NEXT_PUBLIC_SITE_URL="http://localhost:3000"',
    'NEXT_PUBLIC_STOREFRONT_URL="http://localhost:3000"',
  ].join("\n");
}

// Replace values
if (API_URL) {
  envContent = envContent.replace(
    /NEXT_PUBLIC_API_URL=.*/,
    `NEXT_PUBLIC_API_URL="${API_URL}"`
  );
}
if (ASSETS_URL) {
  envContent = envContent.replace(
    /NEXT_PUBLIC_ASSETS_BASE_URL=.*/,
    `NEXT_PUBLIC_ASSETS_BASE_URL="${ASSETS_URL}"`
  );
}
envContent = envContent.replace(
  /NEXT_PUBLIC_TENANT_NAME=.*/,
  `NEXT_PUBLIC_TENANT_NAME="${TENANT_NAME}"`
);

fs.writeFileSync(path.join(TARGET_DIR, ".env.local"), envContent);
ok(".env.local created.");

// ─── Step 4: Overrides ──────────────────────────────────────────
step("4/6", "Creating override scaffolding…");

const overridesDir = path.join(TARGET_DIR, "src", "overrides");
fs.mkdirSync(overridesDir, { recursive: true });
fs.writeFileSync(
  path.join(overridesDir, "index.ts"),
  `// Tenant-specific component overrides\n// Export named overrides here to replace core components.\nexport default {};\n`
);
ok("src/overrides/index.ts created.");

// ─── Step 5: redirects.json ─────────────────────────────────────
step("5/6", "Creating redirects.json…");
fs.writeFileSync(path.join(TARGET_DIR, "redirects.json"), "[]\n");
ok("redirects.json created.");

// ─── Step 6: Fresh git ──────────────────────────────────────────
step("6/6", "Initializing fresh git repository…");

fs.rmSync(path.join(TARGET_DIR, ".git"), { recursive: true, force: true });
run("git init", { cwd: TARGET_DIR });
run("git add -A", { cwd: TARGET_DIR });
run('git commit -m "Initial commit — scaffolded from storefront template"', {
  cwd: TARGET_DIR,
});
ok("Fresh git repo initialized.");

// ─── Done ────────────────────────────────────────────────────────
console.log(`
${c.bold}${c.green}✅ Storefront "${TENANT_NAME}" is ready!${c.reset}

${c.bold}Next steps:${c.reset}
  ${c.cyan}cd ${TENANT_NAME}${c.reset}
  ${c.cyan}yarn install${c.reset}           ${c.dim}# Install dependencies${c.reset}
  ${c.cyan}yarn dev${c.reset}               ${c.dim}# Start dev server${c.reset}

${c.bold}Customize:${c.reset}
  ${c.dim}•${c.reset} Edit ${c.bold}.env.local${c.reset} for environment config
  ${c.dim}•${c.reset} Edit ${c.bold}src/overrides/index.ts${c.reset} for component overrides
  ${c.dim}•${c.reset} Edit ${c.bold}src/app/globals.css${c.reset} for theme / branding
  ${c.dim}•${c.reset} Edit ${c.bold}redirects.json${c.reset} for tenant-specific redirects

${c.bold}Update core:${c.reset}
  ${c.cyan}cd core && git pull origin main && cd ..${c.reset}
  ${c.cyan}git add core && git commit -m "chore: bump core"${c.reset}
`);
