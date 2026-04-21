# saleor-template-standard

Standard Saleor storefront template (Next.js App Router) intended for a **single tenant per deploy**.

## What’s Included

- Basic UI: homepage, category/search, PDP, cart, checkout, account
- YMM (Fitment Groups) via **PartsLogic**
- Checkout features:
  - Checkout questions
  - PayPal (custom integration in the codebase)
  - Ship to dealer / will-call style flows (when configured)
- Dealer applications / inquiries (forms posting to `POST /api/form-submission`)
- Static pages: Newsletter, Terms & Conditions, Shipping & Returns
- Product options (e.g. Color / Weight / Dimensions)

## Requirements

- Node.js 20+
- Yarn
- A Saleor GraphQL endpoint
- PartsLogic (for YMM)

## Setup

1. Copy `.env.example` to `.env.local` and adjust values.
   - Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local dev.
2. Install and run:

```bash
yarn install
yarn dev
```

## Local Lighthouse

Run Lighthouse against the production build, not `yarn dev`.

Homepage mobile:

```bash
npm run lighthouse:mobile
```

Homepage desktop:

```bash
npm run lighthouse:desktop
```

Run both presets:

```bash
npm run lighthouse:all
```

Test a specific route:

```bash
npm run lighthouse -- --preset=mobile --path=/category/suspension
```

Repeat a route 3 times to compare variance:

```bash
npm run lighthouse -- --preset=mobile --path=/ --runs=3
```

Reuse an existing production build/server:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
npm run lighthouse -- --preset=mobile --path=/ --skip-build --skip-start
```

Reports are written to `reports/lighthouse/` as both HTML and JSON files.

Recommended workflow for mobile debugging:

- Use `npm run lighthouse -- --preset=mobile --path=/ --runs=3`.
- Focus on the median-looking run, not the best run.
- Keep Chrome closed except for the report you are reviewing.
- After Lighthouse, open Chrome DevTools and enable `Rendering -> Layout Shift Regions` and record a `Performance` trace on mobile emulation for the same route.

## Forms (SMTP)

`POST /api/form-submission` supports SMTP delivery when these env vars are set:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`, `SMTP_TO`

Optional:

- `SMTP_REPLY_TO`
- `EMAIL_SUBJECT_PREFIX`

## Template-Friendly Builds

This template is expected to:

- `yarn build` succeeds even if optional env vars are missing.
- Pages that rely on external services should degrade gracefully when not configured.

## Apple Pay

See:

- `APPLE_PAY_QUICK_START.md`
- `APPLE_PAY_SETUP.md`
