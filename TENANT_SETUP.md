# Tenant Setup Guide

This template uses a **submodule architecture**. Shared code lives in `core/` (storefront-core), while tenant-specific customizations live in `src/`.

## Getting Started

```bash
# Clone with submodules
git clone --recurse-submodules <your-tenant-repo-url>
cd your-tenant

# If you already cloned without --recurse-submodules:
git submodule update --init --recursive

# Install dependencies
yarn install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your Saleor API URL, etc.

# Run dev server
yarn dev
```

## Customization

### Theme (`src/app/globals.css`)
Edit this file to customize colors, fonts, and global styles. This file is tenant-specific and not part of core.

### Overrides (`src/overrides/index.ts`)
The override system lets you replace core components/config without modifying core. Create `src/overrides/index.ts` and export your overrides. See `src/lib/overrides/README.md` (in core) for details.

### Static Pages
Tenant-specific pages (about, contact, privacy, terms, etc.) live in `src/app/`. Add or modify them freely.

### Public Assets
Replace logos and images in `public/` with your own branding.

## Updating Core

```bash
# Pull latest core changes
cd core
git pull origin main
cd ..
git add core
git commit -m "chore: update storefront-core"
```

## How Import Resolution Works

`@/` imports resolve **tenant `src/` first**, then fall back to **`core/src/`**. This means:
- To override a core component, create the same file path in your `src/` directory
- If the file doesn't exist in `src/`, it automatically resolves from `core/src/`
