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

