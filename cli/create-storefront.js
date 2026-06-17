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
  --store-name    ${c.dim}(optional)${c.reset}  Display store name used to seed legal pages
  --page-type-id  ${c.dim}(optional)${c.reset}  Saleor PageType id for creating new legal pages
  --help          Show this message

${c.bold}Environment:${c.reset}
  SALEOR_ADMIN_TOKEN  ${c.dim}(optional)${c.reset}  App/staff token with MANAGE_PAGES. When set
                      (with --api-url), the CLI upserts the default legal
                      pages (privacy-policy, terms-and-conditions, warranty)
                      into Saleor from cli/seed/legal-pages.json. When unset,
                      the seed step is skipped and the scaffold still completes.
`);
  process.exit(0);
}

if (!args.name) {
  fail("--name is required. Run with --help for usage.");
}

const TENANT_NAME = args.name;
const API_URL = args["api-url"] || "";
const ASSETS_URL = args["assets-url"] || "";
const STORE_NAME = args["store-name"] || TENANT_NAME;
const PAGE_TYPE_ID = args["page-type-id"] || process.env.SALEOR_PAGE_TYPE_ID || "";
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

// ─── Saleor legal-page seeding (best-effort) ─────────────────────
//
// Upserts the default legal pages (privacy-policy, terms-and-conditions,
// warranty) into the tenant's Saleor instance from cli/seed/legal-pages.json.
// The fixture is the must-have, version-controlled deliverable; this live push
// is best-effort and is intentionally guarded so it can NEVER crash the
// provision flow:
//   - missing SALEOR_ADMIN_TOKEN  -> warn + skip
//   - missing --api-url           -> warn + skip
//   - any GraphQL/network failure -> warn + continue (per-page)
//
// Saleor mutation shapes (Saleor 3.x):
//   query  page(slug: String!) { id }                       // existence check
//   mutation PageUpdate(id, input: { title, content })      // content = JSONString
//   mutation PageCreate(input: { slug, title, content, pageType, isPublished })
//
// NOTE: pageCreate REQUIRES a pageType id, which is tenant/instance-specific and
// cannot be hardcoded here. Supply it via --page-type-id or SALEOR_PAGE_TYPE_ID.
// If a page does not yet exist and no pageType id is available, we SKIP the
// create for that slug (with a warning) rather than guessing an id and failing.
// TODO(provisioning): wire the per-tenant PageType id (the "Legal"/ancillary
// page type) into provisioning so new tenants get all three pages created, not
// just updated. Until then, ensure the pages exist once per instance (manually
// or via a provisioning script) and this step will keep their content current.
async function seedLegalPages({ apiUrl, token, storeName, effectiveDate, pageTypeId }) {
  if (!token) {
    warn("SALEOR_ADMIN_TOKEN not set — skipping Saleor legal-page seed.");
    return;
  }
  if (!apiUrl) {
    warn("No --api-url provided — skipping Saleor legal-page seed.");
    return;
  }

  const fixturePath = path.join(__dirname, "seed", "legal-pages.json");
  let fixtures;
  try {
    fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  } catch (e) {
    warn(`Could not read legal-pages fixture (${e.message}) — skipping seed.`);
    return;
  }

  const fill = (str) =>
    String(str)
      .split("{{STORE_NAME}}")
      .join(storeName)
      .split("{{EFFECTIVE_DATE}}")
      .join(effectiveDate);

  // Recursively fill tokens in every string of the Editor.js content tree.
  const fillContent = (node) => {
    if (typeof node === "string") return fill(node);
    if (Array.isArray(node)) return node.map(fillContent);
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = fillContent(v);
      return out;
    }
    return node;
  };

  async function gql(query, variables) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors && json.errors.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    return json.data;
  }

  const PAGE_BY_SLUG = `query PageBySlug($slug: String!) { page(slug: $slug) { id } }`;
  const PAGE_UPDATE = `
    mutation PageUpdate($id: ID!, $input: PageInput!) {
      pageUpdate(id: $id, input: $input) {
        page { id slug }
        errors { field message code }
      }
    }`;
  const PAGE_CREATE = `
    mutation PageCreate($input: PageCreateInput!) {
      pageCreate(input: $input) {
        page { id slug }
        errors { field message code }
      }
    }`;

  for (const entry of fixtures) {
    const slug = entry.slug;
    const title = fill(entry.title || slug);
    // Saleor stores Editor.js content as a JSONString scalar.
    const content = JSON.stringify(fillContent(entry.content || { blocks: [] }));

    try {
      const existing = await gql(PAGE_BY_SLUG, { slug });
      const pageId = existing && existing.page ? existing.page.id : null;

      if (pageId) {
        const data = await gql(PAGE_UPDATE, {
          id: pageId,
          input: { title, content },
        });
        const errs = data.pageUpdate && data.pageUpdate.errors;
        if (errs && errs.length) {
          warn(`Legal page "${slug}" update returned errors: ${errs.map((e) => e.message).join("; ")}`);
        } else {
          ok(`Legal page "${slug}" updated.`);
        }
      } else if (pageTypeId) {
        const data = await gql(PAGE_CREATE, {
          input: { slug, title, content, pageType: pageTypeId, isPublished: true },
        });
        const errs = data.pageCreate && data.pageCreate.errors;
        if (errs && errs.length) {
          warn(`Legal page "${slug}" create returned errors: ${errs.map((e) => e.message).join("; ")}`);
        } else {
          ok(`Legal page "${slug}" created.`);
        }
      } else {
        warn(
          `Legal page "${slug}" does not exist and no --page-type-id / SALEOR_PAGE_TYPE_ID was provided — skipping create.`
        );
      }
    } catch (e) {
      warn(`Legal page "${slug}" seed failed (${e.message}) — continuing.`);
    }
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
step("1/7", "Cloning template repository…");

if (fs.existsSync(TARGET_DIR)) {
  fail(`Directory "${TENANT_NAME}" already exists.`);
}

run(`git clone "${TEMPLATE_URL}" "${TARGET_DIR}"`);
ok("Template cloned.");

// ─── Step 2: Init submodules ─────────────────────────────────────
step("2/7", "Initializing submodules…");
run("git submodule update --init --recursive", { cwd: TARGET_DIR });
ok("Submodules initialized.");

// ─── Step 3: .env.local ──────────────────────────────────────────
step("3/7", "Creating .env.local…");

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
step("4/7", "Creating override scaffolding…");

const overridesDir = path.join(TARGET_DIR, "src", "overrides");
fs.mkdirSync(overridesDir, { recursive: true });
fs.writeFileSync(
  path.join(overridesDir, "index.ts"),
  `// Tenant-specific component overrides\n// Export named overrides here to replace core components.\nexport default {};\n`
);
ok("src/overrides/index.ts created.");

// ─── Step 5: redirects.json ─────────────────────────────────────
step("5/7", "Creating redirects.json…");
fs.writeFileSync(path.join(TARGET_DIR, "redirects.json"), "[]\n");
ok("redirects.json created.");

// ─── Step 6: Seed legal pages (best-effort) ─────────────────────
// Wrapped in an async IIFE because the Saleor seed is async. The seed step is
// guarded internally and never throws, so the scaffold always completes.
(async () => {
  step("6/7", "Seeding legal pages into Saleor…");
  const effectiveDate = new Date().toISOString().slice(0, 10);
  try {
    await seedLegalPages({
      apiUrl: API_URL,
      token: process.env.SALEOR_ADMIN_TOKEN || "",
      storeName: STORE_NAME,
      effectiveDate,
      pageTypeId: PAGE_TYPE_ID,
    });
  } catch (e) {
    warn(`Legal-page seed step errored (${e.message}) — continuing.`);
  }

  // ─── Step 7: Fresh git ────────────────────────────────────────
  step("7/7", "Initializing fresh git repository…");

  fs.rmSync(path.join(TARGET_DIR, ".git"), { recursive: true, force: true });
  run("git init", { cwd: TARGET_DIR });
  run("git add -A", { cwd: TARGET_DIR });
  run('git commit -m "Initial commit — scaffolded from storefront template"', {
    cwd: TARGET_DIR,
  });
  ok("Fresh git repo initialized.");

  // ─── Done ──────────────────────────────────────────────────────
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
})();
