# Tenant Setup Guide

## Prerequisites

- **Git** ≥ 2.30 (with submodule support)
- **Node.js** ≥ 18
- **Yarn** (or npm/pnpm)

---

## Quick Start (CLI)

The fastest way to create a new tenant storefront:

```bash
node cli/create-storefront.js \
  --name "my-store" \
  --api-url "https://my-store.saleor.cloud/graphql/" \
  --assets-url "https://cdn.my-store.com"
```

This will:
1. Clone the template into `./my-store`
2. Initialize the `core` submodule
3. Generate `.env.local` with your values
4. Scaffold override files
5. Initialize a fresh git repo

### CLI Options

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | ✅ | Tenant name (used as directory name) |
| `--api-url` | | Saleor GraphQL API endpoint |
| `--assets-url` | | Assets / CDN base URL |
| `--template-url` | | Custom template repo URL |
| `--help` | | Show usage info |

---

## Manual Setup

If you prefer to set things up manually:

```bash
# 1. Clone the template
git clone https://github.com/webshopmanager/saleor-template-standard.git my-store
cd my-store

# 2. Initialize the core submodule
git submodule update --init --recursive

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local with your tenant values

# 4. Create override scaffolding
mkdir -p src/overrides
echo 'export default {};' > src/overrides/index.ts

# 5. Install & run
yarn install
yarn dev
```

---

## Directory Structure

```
my-store/
├── core/                  # ← Submodule: storefront-core (shared code)
│   ├── components/
│   ├── lib/
│   └── ...
├── src/
│   ├── app/               # Next.js app directory
│   │   ├── globals.css    # ← Theme customization
│   │   └── ...
│   └── overrides/         # ← Tenant-specific component overrides
│       └── index.ts
├── .env.local             # ← Tenant environment variables
├── redirects.json         # ← Tenant-specific redirects
├── cli/                   # Scaffolding tool
└── package.json
```

---

## Customization

### Theme & Branding (`src/app/globals.css`)

Override CSS variables to change colors, fonts, and spacing:

```css
:root {
  --color-primary: #1a73e8;
  --color-secondary: #34a853;
  --font-family: 'Inter', sans-serif;
}
```

### Component Overrides (`src/overrides/index.ts`)

Replace core components with tenant-specific versions:

```ts
import CustomHeader from "./CustomHeader";
import CustomFooter from "./CustomFooter";

export default {
  Header: CustomHeader,
  Footer: CustomFooter,
};
```

### Environment Variables (`.env.local`)

Key variables to configure:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Saleor GraphQL endpoint |
| `NEXT_PUBLIC_ASSETS_BASE_URL` | CDN / assets URL |
| `NEXT_PUBLIC_TENANT_NAME` | Tenant identifier |
| `NEXT_PUBLIC_BRAND_NAME` | Display name |
| `NEXT_PUBLIC_THEME_PALETTE` | Color palette name |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |

---

## Updating Core

### Automatic (GitHub Actions)

A daily workflow (`core-sync.yml`) checks for core updates and opens a PR automatically. It also triggers immediately when `storefront-core` pushes to `main`.

### Manual

```bash
cd core
git checkout main
git pull origin main
cd ..
git add core
git commit -m "chore: bump storefront-core"
git push
```

---

## Troubleshooting

### Submodule not initialized

```
Error: Cannot find module 'core/...'
```

**Fix:** `git submodule update --init --recursive`

### Empty `core/` directory

The submodule wasn't cloned. Run:

```bash
git submodule init
git submodule update
```

### Build errors after core update

Core may have added new dependencies or changed APIs:

1. Run `yarn install` to pick up new deps
2. Check the core changelog / diff for breaking changes
3. Update overrides if component props changed

### Permission denied on CLI

```bash
chmod +x cli/create-storefront.js
```

## Standard header & brand chrome (configuration, not code)

The standard way to brand a tenant's header/footer and pick its layout is
**configuration only** — no header/footer component forks. Requires core with
PR #157 (`feat/header-brand-tokens-inline-nav`) or later.

### 1. Layout (env)

| Variable | Values | Effect |
|---|---|---|
| `NEXT_PUBLIC_HEADER_LAYOUT` | `inline` / unset | `inline` = single-row header, nav links beside the logo (the Foose/Jess pattern — the fleet standard). Unset = classic two-row header. |

### 2. Brand chrome (theme tokens in `src/app/globals.css`)

Add inside your `[data-theme="<tenant>"]` block. Every token falls back to the
current default, so set only what your brand needs:

```css
--color-header-bg: #cc0000;      /* desktop+mobile nav bar (default: secondary-950) */
--color-topbar-bg: #660000;      /* contact strip above the header (default: secondary-950) */
--color-header-accent: #330000;  /* nav hover/active/underline (default: primary-500) */
--footer-bg-color: #001d5a;      /* footer background (default: secondary-950) */
--footer-fg-color: #e7ecf7;      /* footer link + site-info body text (default: secondary-50/100) */
--color-footer-accent: #cfe0ff;  /* footer column headings (default: primary-600) */
```

**Dark-brand warning:** if your brand primary is a dark color (navy, deep
green), the defaults will render footer headings/site-info nearly invisible on
the dark footer — set `--color-footer-accent` and `--footer-fg-color` to light
values. Same logic for `--color-header-accent` on a colored header bar.

### 3. Content (Saleor CMS — fetched at runtime, no rebuild)

- **`navbar` menu** — the desktop nav links (curated-wins: when this menu
  exists, categories are not auto-listed; add a "Catalog" item pointing at
  `/category` if you want one).
- **`footer` menu** — footer link columns.
- **`site-info` page** — phone/email/hours for the top bar and footer.

### 4. Socials (env, footer icons render only when set)

`NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_TWITTER_URL`,
`NEXT_PUBLIC_YOUTUBE_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`

Reference implementations: `diversified-shafts-solutions-storefront` (navy,
`develop`) and `auto-shafts-storefront` (two-tone red). Both carry zero
header/footer component overrides.
