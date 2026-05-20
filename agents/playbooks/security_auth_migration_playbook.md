# Playbook: Tenant Security/Auth and GraphQL Fetch Migration

Roll out the current `core` security/auth branch across tenant wrapper repos by updating each tenant to the prepared `core` branch, then reconciling any tenant-local `src/` overrides that still use unsafe auth, logging, Apollo, or stale GraphQL data-layer patterns.

**Tenant branch:** `fix/security-audit-auth-fetch`
**Core branch:** `staging`
**Core reference commit:** latest reviewed `origin/staging`; the security/auth and Apollo-removal changes have been merged into core
**Wrapper reference commits:** `d59af71`, `c3e1a46`, `41859d8`
**Post-review wrapper additions:** complete core API route export audit, including Braintree, page-update, products-update, and shipping-estimate route exports; Apollo removal in favor of the fetch-only GraphQL layer
**Tenant scope:** all 45 repos under `../storefront` with a `package.json`

---

## Implementation Review Notes

This rollout has two repositories in play for every tenant:

- the tenant wrapper repo
- the nested `core` submodule repo

Do not treat the wrapper reference commits as the full implementation. The wrapper commits add route discovery, dependency, env, and middleware changes. The shared security/auth implementation lives in `core`.

Current reviewed target:

- wrapper branch containing `d59af71`, `c3e1a46`, and `41859d8`
- wrapper post-review additions for any missing `core/src/app/api/**/route.ts` discovery exports
- `core` branch `staging` at the latest reviewed `origin/staging` SHA
- wrapper `HEAD` records the same `core` SHA as the checked-out submodule worktree

Branch-name caveat:

- The wrapper reference branch in this workspace is named `fix/security-audit-miramee`.
- Tenant rollout branches should still be named `fix/security-audit-auth-fetch` unless a tenant already has a documented branch naming exception.
- Do not confuse the tenant wrapper branch name with the nested `core` branch name. The nested `core` branch is `staging`.

First tenant rollout finding:

- `auto-city-classic-storefront-v2` was started on `fix/security-audit-auth-fetch` with `core` pinned to `5db9c68de33912d266812e2e81ce37596e83f6a6` from `staging`.
- Wrapper reconciliation covered the `core` staging update, 12 missing API route exports found in that tenant, bundle page exports, `useTokenExpiration` re-export, SDK-cookie middleware refresh handling, `.env.example` `SESSION_COOKIE_SECRET`, `@saleor/auth-sdk`, removal of `@apollo/client` from `package.json`, and server-side `createApolloServerClient` replacement with `fetchGraphQL` in 15 showroom/data files.
- That was not enough to complete the tenant. The build still failed because client-side files in account, cart, product detail, and related UI flows still imported `@apollo/client`.
- Treat this as a hard rollout lesson: server-client replacement plus dependency removal is incomplete until every client-side Apollo hook/import is migrated to `useGraphQLQuery`, `useGraphQLMutation`, `useLazyGraphQLQuery`, `graphqlRequest`, or `gql` from the core fetch-only layer.
- Do not mark a tenant `done` while the Apollo grep gate still finds client-side imports. Mark it `blocked` with the file list if the client-side hook migration is not completed in that pass.

## Summary

Assume `core` is the source of truth for the shared implementation. The tenant migration work happens in wrapper repos only when tenant-local overrides mask the new `core` behavior.

Current tracker snapshot:

- The live rollout status is tracked in `agents/playbooks/security_auth_migration_progress.md`; do not use the initial inventory table at the bottom of this playbook as current status.
- Latest local audit state: 4 tenants are `done`, 41 tenants are `blocked`, and 0 tenants are `pending`.
- Most blocked tenants still need writable tenant workspaces, a branch based on the intended tenant base, `core` moved to `staging`, missing local API route exports added, Apollo/server-client usage migrated to the fetch-only layer, and localStorage/JWT/Bearer token patterns removed.
- Some blocked tenants have extra preflight blockers such as dirty worktrees, uninitialized or empty `core` submodules, or tenant-specific `core` branches. Resolve those before editing tenant wrapper files.
- When all rows are `done`, `blocked`, or `skipped`, do not create work from the initial inventory table. Pick the next tenant from the progress tracker, confirm the blocker is resolved, then move that row back through `in-progress`.

Blocked tenant triage from the latest local audit:

- 24 tenants are on active non-main bases, mostly `feat/fitment-management-updates`; confirm the intended base before creating or rebasing the migration branch.
- 9 tenants are clean on `main` with initialized `core`, but still need staging reconciliation and wrapper cleanup.
- 4 tenants have uninitialized or empty `core` submodules: `connector-experts-storefront`, `sparktec-motorsports-storefront`, `sunton-storefront`, and `truck-outlaw-storefront`.
- 3 tenants were already dirty before audit: `exhaust-factory-storefront-v2`, `fuelab--storefront-v2`, and `inglewood-transmission-storefront`.
- `big-dog-aftermarket-storefront` has an older read-only audit note and should be rechecked first when tenant writes are available.

Named clean-`main` batch with initialized `core`:

- `camlocker-storefront`
- `dana-aftermarket-storefront-v2`
- `diversified-shafts-solutions-storefront`
- `foose-performance-storefront-v2`
- `heavy-duty-pros-hdp-storefront-v2`
- `jess-performance-storefront-v2`
- `kermatdi-storefront`
- `kt-performance-storefront`
- `sprocket-center-storefront`

Named active non-main batch:

- `bmc-truck-storefront`
- `body-kits-storefront`
- `caltric-storefront`
- `classic-tube-storefront`
- `clutch-masters-storefront`
- `dales-super-store-storefront`
- `dans-diesel-performance-storefront`
- `east-coast-gear-supply-storefront-v2`
- `extreme-metal-products-storefront`
- `gibson-performance-storefront`
- `granatelli-motorsports-storefront`
- `katech-engines-storefront`
- `lincoln-diesel-specialties-storefront`
- `rare-electrical-storefront`
- `shifted-industries-storefront`
- `socal-powersports-storefront`
- `stowe-cargo-storefront`
- `suncoast-diesel-storefront`
- `titan-truck-storefront`
- `trails-end-truck-storefront`
- `tre-performance-storefront`
- `underdog-diesel-storefront`
- `upr-storefront`
- `west-coast-metric-storefront`

Use the detailed row in `security_auth_migration_progress.md` as the source for each tenant's exact missing routes, Apollo files, auth-token patterns, env/dependency gaps, and submodule state.

Regenerate the tracker snapshot before starting a resumed write pass:

```bash
awk -F'|' '/^\|/ && $2 !~ /Tenant|---/ {gsub(/^ +| +$/, "", $3); count[$3]++} END {for (s in count) print s, count[s]}' agents/playbooks/security_auth_migration_progress.md | sort
grep -nE '\| (pending|in-progress|blocked) \|' agents/playbooks/security_auth_migration_progress.md
awk -F'|' '/clean main checkout/ && !/core submodule is uninitialized/ {gsub(/^ +| +$/, "", $2); print $2}' agents/playbooks/security_auth_migration_progress.md
awk -F'|' '/current checkout feat\// {gsub(/^ +| +$/, "", $2); print $2}' agents/playbooks/security_auth_migration_progress.md
awk -F'|' '/core submodule is uninitialized|core submodule is uninitialized\/empty/ {gsub(/^ +| +$/, "", $2); print $2}' agents/playbooks/security_auth_migration_progress.md
awk -F'|' '/worktree already dirty/ {gsub(/^ +| +$/, "", $2); print $2}' agents/playbooks/security_auth_migration_progress.md
rg -o 'braintree/get-config|braintree/transaction-initialize|checkout/tiered|shipping-estimate|viralsweep/get-config' agents/playbooks/security_auth_migration_progress.md | sort | uniq -c | sort -nr
```

The first command refreshes status counts. The second lists unresolved rows. The next four commands rederive the clean-`main`, active non-main, uninitialized-`core`, and dirty-worktree batches. The final command refreshes the observed missing-route hot spots from the tracker notes.

Recommended order when tenant writes are available:

1. Recheck `big-dog-aftermarket-storefront` first because its row predates the full audit template used for the later tenants.
2. Prefer clean `main` tenants with initialized `core` for the first resumed write passes; they have the fewest preflight variables.
3. For uninitialized or empty `core` tenants, initialize and move `core` to `staging` before trusting any route or overlap comparison.
4. For dirty tenants, resolve ownership of the existing changes before claiming the row. Do not stash, reset, or overwrite another person's work just to run the migration.
5. For active non-main tenants, confirm the intended rollout base before branching. If the feature branch is intentional, keep it and document it in the progress row and PR.

For each tenant:

1. Create `fix/security-audit-auth-fetch`.
2. Point the `core` submodule to `staging`.
3. Port the wrapper-level changes from the reference branch where the tenant does not already have them.
4. Audit tenant `src/` overrides for server-client, client-side Apollo, auth-token, payment-header, and sensitive-log patterns.
5. Reconcile only the tenant-local files that mask the shared `core` security/auth behavior.
6. Verify build and run the security grep gates.

The target state matches the current `core` security implementation:

- Server-side Apollo `createApolloServerClient` is removed.
- Server GraphQL reads use `fetchGraphQL` from `@/graphql/fetch-client`.
- Client GraphQL uses the fetch-only helpers from `@/graphql/request` and `@/graphql/hooks`; Apollo provider/client code is removed.
- GraphQL documents use the local `gql` helper from `@/graphql/gql`, not `@apollo/client`.
- `@apollo/client` and the direct `graphql` dependency are removed from tenant manifests and lockfiles.
- Auth uses Saleor Auth SDK cookie storage instead of `localStorage` tokens.
- Cart session data is persisted through a signed, `httpOnly` cookie route.
- Payment API routes use shared authenticated GraphQL/payment helpers.
- Sensitive request, token, header, and detailed payment logs are removed.
- Wrapper routes that Next.js must discover locally re-export their matching `@core` routes.
- Every `core/src/app/api/**/route.ts` route is either discovered through a local wrapper re-export or intentionally documented as skipped.
- Wrapper middleware uses Saleor Auth SDK cookie names and refreshes from the SDK refresh cookie when the access cookie is missing.
- Tenant GraphQL query, mutation, hook, request, and client files are treated as data-layer overrides and flagged for review; tenant overrides should normally be UI-only.

---

## Agent Rules For This Rollout

Use these rules when assigning this work to weaker or parallel agents:

- One agent owns one tenant at a time.
- An agent must claim the tenant in `agents/playbooks/security_auth_migration_progress.md` before editing.
- An agent must not rewrite the progress file; use line-targeted edits only.
- An agent must not make shared `core` implementation changes from inside a tenant migration.
- An agent must not copy large files from the reference wrapper over tenant-local files unless the tenant file is only a stale copy of core behavior.
- Prefer one-line `@core` re-exports for wrapper route/page discovery files.
- Audit all API route discovery, not only the auth/payment routes named in this playbook.
- Flag every tenant-local GraphQL query or mutation override in the progress notes and tenant PR.
- Preserve tenant branding, copy, theme, feature flags, redirects, and custom pages unless they directly mask unsafe auth/security behavior.
- Each tenant PR must include both the wrapper changes and the `core` submodule pointer update.
- If a tenant build fails for a pre-existing unrelated reason, mark the tenant `blocked` or document the failure clearly; do not make unrelated fixes.

---

## Preflight Before Tenant Work

Run this in the rollout/reference workspace before assigning tenants:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git ls-tree HEAD core
git submodule status
git -C core rev-parse --abbrev-ref HEAD
git -C core rev-parse HEAD
```

Expected core target:

```text
origin/staging
```

Record the exact `git -C core rev-parse HEAD` SHA in the tenant progress notes and PR after checking out `staging`.

If `git ls-tree HEAD core` does not show the same SHA as `git -C core rev-parse HEAD`, the wrapper has an uncommitted submodule pointer change. Commit that pointer before treating the wrapper branch as fully migrated, or explicitly record that each tenant branch must commit its own `core` pointer update.

Verify the 45-tenant inventory:

```bash
find ../storefront -mindepth 2 -maxdepth 2 -name package.json -printf '%h\n' | sed 's#^../storefront/##' | sort
find ../storefront -mindepth 2 -maxdepth 2 -name package.json -printf '%h\n' | wc -l
```

## Reference Wrapper Commits

The wrapper branch contains tenant-level changes that are not covered by only moving the `core` submodule. Port these changes into each tenant unless the tenant already has an equivalent local implementation.

### `d59af71` - security audit and wrapper route exports

Required wrapper changes:

- Add `.env.example` entry:

```env
# Server-side session signing
# Required in production. Use a high-entropy value and keep it private.
SESSION_COOKIE_SECRET=""
```

- Add thin route exports so App Router discovers the shared `core` routes from the wrapper:

```ts
// src/app/api/auth/login/route.ts
export { POST } from "@core/app/api/auth/login/route";

// src/app/api/auth/session/route.ts
export { GET } from "@core/app/api/auth/session/route";

// src/app/api/auth/set-password/route.ts
export { POST } from "@core/app/api/auth/set-password/route";

// src/app/api/cart-session/route.ts
export { GET, POST, DELETE } from "@core/app/api/cart-session/route";

// src/app/api/graphql/route.ts
export { POST } from "@core/app/api/graphql/route";

// src/app/api/paypal-app/api/trpc/[...procedure]/route.ts
export { GET, POST } from "@core/app/api/paypal-app/api/trpc/[...procedure]/route";
```

- Confirm the existing auth utility routes still re-export core. These commonly existed before this branch, but stale tenant-local versions will break SDK cookie clearing:

```ts
// src/app/api/auth/clear/route.ts
export { POST } from "@core/app/api/auth/clear/route";

// src/app/api/auth/clear-cookies/route.ts
export { GET } from "@core/app/api/auth/clear-cookies/route";

// src/app/api/auth/set/route.ts
export { POST } from "@core/app/api/auth/set/route";
```

- Replace tenant `src/hooks/useTokenExpiration.ts` with:

```ts
export { useTokenExpiration } from "@core/hooks/useTokenExpiration";
```

Do not copy `security-audit.md` into every tenant unless the tenant repo convention keeps audit docs. The rollout playbook is the operational source for this migration.

### `c3e1a46` - dependency and route export cleanup

Required wrapper changes:

- Add `@saleor/auth-sdk` to tenant dependencies.
- Remove `jwt-decode` when no tenant-local code still imports it.
- Update the active lockfile used by that tenant (`yarn.lock`, `package-lock.json`, or both if the repo already tracks both).
- Add Viralsweep config route export if the tenant has Viralsweep support or inherits the core widget:

```ts
// src/app/api/viralsweep/get-config/route.ts
export { GET } from "@core/app/api/viralsweep/get-config/route";
```

- Fix stale re-exports that no longer exist in `core`:

```ts
// src/app/category/[slug]/page.tsx
export { default, generateMetadata } from "@core/app/category/[slug]/page";

// src/app/search/layout.tsx
export { default } from "@core/app/search/layout";
```

### `41859d8` - middleware refresh and additional core route exports

Required wrapper changes:

- Add the tiered checkout route export:

```ts
// src/app/api/checkout/tiered/route.ts
export { POST } from "@core/app/api/checkout/tiered/route";
```

- Confirm existing payment routes are either one-line `@core` exports or reconciled local implementations. App Router will not discover nested `core` routes unless the wrapper exposes them locally. Use this matrix for any tenant that supports the provider or inherits the core checkout UI:

```ts
// src/app/api/paypal/get-config/route.ts
export { POST } from "@core/app/api/paypal/get-config/route";

// src/app/api/paypal/create-order/route.ts
export { POST } from "@core/app/api/paypal/create-order/route";

// src/app/api/paypal/capture-order/route.ts
export { POST } from "@core/app/api/paypal/capture-order/route";

// src/app/api/affirm/get-config/route.ts
export { POST } from "@core/app/api/affirm/get-config/route";

// src/app/api/affirm/create-checkout/route.ts
export { POST } from "@core/app/api/affirm/create-checkout/route";

// src/app/api/affirm/process-payment/route.ts
export { POST } from "@core/app/api/affirm/process-payment/route";

// src/app/api/affirm/check-status/route.ts
export { POST } from "@core/app/api/affirm/check-status/route";

// src/app/api/affirm/test-connection/route.ts
export { GET, OPTIONS } from "@core/app/api/affirm/test-connection/route";

// src/app/api/braintree/get-config/route.ts
export { POST } from "@core/app/api/braintree/get-config/route";

// src/app/api/braintree/transaction-initialize/route.ts
export { POST } from "@core/app/api/braintree/transaction-initialize/route";
```

- Add bundle page exports where the tenant does not override bundles locally:

```ts
// src/app/bundles/page.tsx
export { default, metadata } from "@core/app/bundles/page";

// src/app/bundles/[slug]/page.tsx
export { default, generateMetadata } from "@core/app/bundles/[slug]/page";
```

- Reconcile `src/middleware.ts` to use SDK cookie names and refresh helpers:
  - import `getSdkStorageKey`, `SDK_ACCESS_TOKEN_SUFFIX`, and `SDK_REFRESH_TOKEN_SUFFIX` from `@/lib/auth/cookies`
  - import `refreshSaleorAuthTokens` and `setRefreshedAuthCookies` from `@/lib/auth/middlewareRefresh`
  - derive access and refresh cookie names from the normalized `NEXT_PUBLIC_API_URL`
  - if the access cookie is missing but the refresh cookie exists, call `refreshSaleorAuthTokens`
  - call `setRefreshedAuthCookies` on redirect and pass-through responses when refreshed tokens are available
  - preserve tenant-specific middleware behavior such as slug redirects and feature-route checks
  - do not reintroduce `jwt-decode`, direct `token`/`refreshToken` cookie names, or `Authorization: JWT` middleware validation

---

## Multi-Agent Update Protocol

Create `agents/playbooks/security_auth_migration_progress.md` in the rollout workspace before starting tenant work. Use line-targeted edits only; never rewrite the whole file while multiple agents are working.

Use an explicit progress file path so commands are safe from either workspace:

```bash
# From the rollout/reference workspace:
progress_file="agents/playbooks/security_auth_migration_progress.md"

# From a tenant repo under ../storefront/<tenant-name>:
progress_file="../../saleor-template-standard/agents/playbooks/security_auth_migration_progress.md"
```

### Claim a tenant

Before starting, verify the tenant is still `pending`:

```bash
grep "| <tenant-name> |" "$progress_file"
```

If it reads `pending`, claim it:

```bash
sed -i "s/| <tenant-name> | pending | - | - |/| <tenant-name> | in-progress | <agent-id> | - |/" "$progress_file"
```

Re-read the line after writing to confirm the claim.

### Mark done

```bash
sed -i "s/| <tenant-name> | in-progress | <agent-id> | - |/| <tenant-name> | done | <agent-id> | <outcome> |/" "$progress_file"
```

Valid `<outcome>` values:

- `core-only`
- `wrapper-reconciled`
- `security-reconciled`
- `skipped`

Do not use `done` until all of these are true:

- `core` is on `staging`, and the wrapper commit records the same submodule SHA.
- the tenant build command from Phase 4.2 passes, or a pre-existing unrelated build failure is documented as a blocker instead of marking `done`.
- The full API route discovery comparison from Phase 4.4 returns no undocumented missing wrapper routes.
- The security grep gates in Phase 4.3 return no unsafe tenant-local hits.
- The Apollo grep below returns no tenant-local hits:

```bash
rg -n "@apollo/client|ApolloClient|ApolloProvider|useApolloClient|useQuery|useMutation|useLazyQuery|__APOLLO_CLIENT__|clearStore|graphql/client|ApolloWrapper" src package.json
```

If any of these checks fail, mark the tenant `blocked` and include the file list or failing command output.

The progress row note is the handoff contract. Keep it compact, but include enough evidence that the next agent does not need to rediscover basic state.

For `done` rows, include:

- outcome classification
- build command and result
- new `core` SHA
- confirmation that the committed wrapper gitlink matches the checked-out `core` SHA
- route discovery result
- Apollo/security grep result
- data override report summary

For `blocked` rows, include:

- the blocker type, such as read-only workspace, dirty worktree, non-main base, uninitialized `core`, build failure, or unfinished migration files
- current wrapper branch
- current `core` branch/SHA or gitlink if `core` is uninitialized
- missing route exports if route comparison was valid
- Apollo/server-client file groups still present
- localStorage/JWT/Bearer/logging patterns still present
- dependency/env gaps when known
- the next concrete action needed before the row can return to `in-progress`

For `skipped` rows, include the exact out-of-scope evidence and the external source of truth. Do not use a pipe character in notes unless it is escaped as `\|`, because this file is a Markdown table.

When updating the note, replace exactly one tenant row. This pattern is safer than matching a partial old note:

```bash
TENANT="<tenant-name>" STATUS="blocked" AGENT="<agent-id>" NOTE="<evidence note>" \
perl -0pi -e 's/^\| \Q$ENV{TENANT}\E \| [^|]+ \| [^|]+ \| [^\n]*$/| $ENV{TENANT} | $ENV{STATUS} | $ENV{AGENT} | $ENV{NOTE} |/m' "$progress_file"
grep "| <tenant-name> |" "$progress_file"
```

Set `STATUS`, `AGENT`, and `NOTE` to the final row values for `done`, `blocked`, or `skipped`. Keep `NOTE` on one line and escape any literal `|` characters.

### Mark blocked

```bash
sed -i "s/| <tenant-name> | in-progress | <agent-id> |/| <tenant-name> | blocked | <agent-id> |/" "$progress_file"
```

Then update the note column with the blocked-row evidence listed above.

### Mark skipped

Use `skipped` only when the repo is genuinely out of scope for this rollout, not when migration work is hard or currently blocked.

Valid skip reasons:

- The repo is not a Next/Saleor storefront wrapper after inspection.
- The repo does not contain the expected tenant `package.json`/`src` shape needed for this playbook.
- The repo has been retired, archived, or replaced, and that status is documented outside this playbook.

Not valid skip reasons:

- Tenant workspace is read-only.
- `core` is uninitialized or on the wrong branch.
- The tenant is on a non-main feature branch.
- The worktree is dirty.
- Apollo, localStorage token, or route export cleanup is broad.
- Build fails after migration work.

If a tenant is skipped, the progress row must include the exact evidence and a pointer to the source of truth, such as the archived repo status or replacement storefront.

### Resume a blocked tenant

Use this sequence when a blocker in `security_auth_migration_progress.md` has been resolved, such as gaining writable tenant access, initializing `core`, or getting confirmation that a non-main tenant base is intended.

1. Re-read the row and copy its blocker note into your local scratch notes:

```bash
grep "| <tenant-name> |" "$progress_file"
```

2. Inspect the tenant before editing. Do not assume the read-only audit is still current:

```bash
cd ../storefront/<tenant-name>
git status --short
git branch --show-current
git submodule status
test -d core/.git -o -f core/.git && git -C core status --short
test -d core/src/app/api || echo "core source missing; initialize/update submodule before route audit"
```

3. If `git status --short` shows changes you did not make, stop and record the dirty paths in the progress row unless the existing blocker already covers them. Do not overwrite or reset them.

4. If the row names a non-main base, confirm whether that base is the rollout base. If it is not, switch to the intended base before creating the migration branch. If it is intended, record the base in the progress row and PR.

5. If `core` is uninitialized or empty, initialize it before running any `core/src` comparisons:

```bash
git submodule update --init core
git -C core fetch origin
git -C core checkout staging
git -C core pull --ff-only origin staging
```

6. Move the progress row from `blocked` to `in-progress` only after the preflight blocker is actually resolved and the tenant is safe to edit:

```bash
sed -i "s/| <tenant-name> | blocked | <old-agent> |/| <tenant-name> | in-progress | <agent-id> |/" "$progress_file"
```

7. Re-run the Phase 2 audit gates. The old row is a handoff aid, not proof that the current tenant state is unchanged.

### Read-only blocked tenant re-audit bundle

Use this bundle when updating a blocked row or preparing a writable migration pass. It does not edit tenant files. Run it from the tenant repo after confirming the worktree is safe to inspect:

```bash
tenant="$(basename "$PWD")"
echo "== $tenant =="
git status --short
git branch --show-current
git submodule status
test -d core/src/app/api && git -C core branch --show-current && git -C core rev-parse HEAD || echo "core source missing"

echo "== missing wrapper API route exports =="
if test -d core/src/app/api; then
  comm -23 <(find core/src/app/api -name route.ts -type f | sed 's#^core/##' | sort) <(find src/app/api -name route.ts -type f | sort)
else
  echo "skipped: core/src/app/api missing"
fi

echo "== high-risk wrapper/core overlaps =="
if test -d core/src; then
  comm -12 <(git ls-files src | sort) <(git -C core ls-files src | sort) | rg "^(src/app/api|src/graphql|src/hooks/useTokenExpiration|src/lib/auth|src/lib/payment-app|src/lib/saleor|src/lib/trpc-client|src/store/useGlobalStore|src/app/components/checkout|src/app/account/payment-methods|src/app/product)" || true
else
  echo "skipped: core/src missing"
fi

echo "== tenant GraphQL query/mutation overrides =="
find src/graphql/queries src/graphql/mutations -type f 2>/dev/null | sort

echo "== server-client Apollo usage =="
rg -n "createApolloServerClient|graphql/server-client|\\.\\./server-client" src || true

echo "== Apollo client/provider/hook usage =="
rg -n "@apollo/client|ApolloClient|ApolloProvider|useApolloClient|useQuery|useMutation|useLazyQuery|__APOLLO_CLIENT__|clearStore|graphql/client|ApolloWrapper" src package.json || true

echo "== auth token/header/log patterns =="
rg -n "console\\.log\\(req\\)|localStorage\\.(getItem|setItem)\\(['\\\"](token|refreshToken)['\\\"]\\)|Authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)|authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)" src || true

echo "== dependency/env evidence =="
rg -n "SESSION_COOKIE_SECRET|\"@saleor/auth-sdk\"|\"@apollo/client\"|\"graphql\"|\"jwt-decode\"" .env.example package.json package-lock.json yarn.lock 2>/dev/null || true
```

If the bundle reports `core source missing`, do not trust the route comparison or high-risk overlap results until the submodule has been initialized and moved to `staging`.

---

## Phase 1: Create Tenant Branch and Update `core`

Run these steps in each tenant repo.

Set `progress_file` as shown in the Multi-Agent Update Protocol before using progress tracker commands from a tenant repo.

### 1.1 Start from the intended base

Do not run `git checkout main` blindly. The progress tracker is the source of truth for known non-main bases, dirty worktrees, and uninitialized `core` states. Re-read the tenant row before changing branches:

```bash
grep "| <tenant-name> |" "$progress_file"
git status --short
git branch --show-current
git rev-parse HEAD
```

Default to `main` only when the row does not document an intended non-main base and the worktree is clean.

```bash
git checkout main
git pull --ff-only
git checkout -b fix/security-audit-auth-fetch
```

If the row documents a feature or tenant-specific base, confirm that base is still intended before branching. If confirmed, stay on that base and branch from it:

```bash
git pull --ff-only
git checkout -b fix/security-audit-auth-fetch
```

Record the base branch and base SHA in the progress notes and PR. If the intended base is unclear, keep the row `blocked`; do not switch branches or rebase to make the migration easier.

If `git status --short` shows changes you did not make, keep the row `blocked` and record the dirty paths unless the existing progress note already covers them. Do not stash, reset, or overwrite another person's work.

### 1.2 Record the current state

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git ls-tree HEAD core
git submodule status
test -d core/.git -o -f core/.git && git -C core rev-parse HEAD || echo "core worktree not initialized"
```

Capture the original wrapper branch/SHA, the committed `core` gitlink from `git ls-tree HEAD core`, and the checked-out `core` worktree SHA when initialized. If the `core` worktree is uninitialized, use the gitlink SHA as the original core pointer and initialize the submodule before running route or overlap audits.

### 1.3 Switch the submodule to the security/auth branch

```bash
cd core
git fetch origin
git checkout staging
git pull --ff-only origin staging
git rev-parse HEAD
cd ..
git add core
```

Important:

- Do not re-port shared auth/security implementation from one tenant into `core`.
- Do not restore `core/src/graphql/server-client.ts`; its removal is intentional.
- Wrapper changes should only reconcile tenant-local overrides.
- The expected `core` branch is `staging`; record the exact checked-out SHA for each tenant.
- Before committing, `git status --short` should show `M core` plus only intentional wrapper file changes.

### 1.4 Pre-commit submodule evidence

Before committing a tenant migration, prove that the wrapper gitlink and checked-out `core` worktree agree:

```bash
git -C core rev-parse --abbrev-ref HEAD
git -C core rev-parse HEAD
git ls-tree HEAD core
git status --short
```

Expected before commit:

- `git -C core rev-parse --abbrev-ref HEAD` prints `staging`.
- `git -C core rev-parse HEAD` is the new core SHA to record in the progress row and PR.
- `git status --short` shows `M core` plus only intentional wrapper changes.
- `git ls-tree HEAD core` still shows the old committed gitlink until the migration commit is created; this is normal before commit.

After committing:

```bash
git ls-tree HEAD core
git -C core rev-parse HEAD
git status --short
```

The SHA from `git ls-tree HEAD core` must match `git -C core rev-parse HEAD`, and `git status --short` must not show `M core`.

---

## Phase 2: Audit Tenant Overrides

Run the audit before editing tenant files.

### 2.0 Detect wrapper files that shadow core files

This repo uses TypeScript paths where `@/*` resolves wrapper files before `core`:

```json
"@/*": ["./src/*", "./core/src/*"]
```

That means a tenant-local file such as `src/lib/auth/saleorAuth.ts`, `src/graphql/client.ts`, `src/store/useGlobalStore.tsx`, or `src/app/api/paypal/get-config/route.ts` can silently override the reviewed `core` implementation even when a wrapper route re-exports `@core`.

Generate the wrapper/core overlap list:

```bash
comm -12 <(git ls-files src | sort) <(git -C core ls-files src | sort)
```

Review every overlap in these high-risk areas:

- `src/app/api/auth/**`
- `src/app/api/graphql/route.ts`
- `src/app/api/cart-session/route.ts`
- `src/app/api/checkout/tiered/route.ts`
- `src/app/api/paypal/**`
- `src/app/api/paypal-app/**`
- `src/app/api/affirm/**`
- `src/app/api/braintree/**`
- `src/app/api/viralsweep/get-config/route.ts`
- `src/graphql/client.ts`
- `src/graphql/fetch-client.ts`
- `src/graphql/gql.ts`
- `src/graphql/hooks.ts`
- `src/graphql/request.ts`
- `src/graphql/server-client.ts`
- `src/graphql/queries/**`
- `src/hooks/useTokenExpiration.ts`
- `src/lib/auth/**`
- `src/lib/payment-app/**`
- `src/lib/saleor/**`
- `src/lib/trpc-client.ts`
- `src/lib/normalizeGraphqlUrl.ts`
- `src/store/useGlobalStore.tsx`
- `src/app/components/checkout/**`
- `src/app/account/payment-methods/**`
- `src/app/product/**`

Safe overlaps are usually one-line `@core` re-exports. Unsafe overlaps are tenant-local copies that still import Apollo, read token localStorage, manually build auth headers, or log sensitive data.

### 2.1 Audit all core API route discovery

App Router discovers routes from the wrapper `src/app/api` tree. Do not assume a route exists locally just because it exists in `core`.

Generate the complete core API route inventory and compare it with the tenant wrapper:

```bash
route_tmp="$(mktemp -d)"
trap 'rm -rf "$route_tmp"' EXIT
find core/src/app/api -name route.ts -type f | sed 's#^core/##' | sort > "$route_tmp/core-api-routes"
find src/app/api -name route.ts -type f | sort > "$route_tmp/wrapper-api-routes"
comm -23 "$route_tmp/core-api-routes" "$route_tmp/wrapper-api-routes"
```

The `comm -23` output is the list of `core` API routes missing from the wrapper. For each missing route:

1. Inspect the core route methods:

```bash
route="src/app/api/<path>/route.ts"
rg -n "export (async function|function|const) (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)|export \\{[^}]*\\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\\b" "core/$route"
```

2. Add a one-line wrapper re-export with exactly those methods:

```ts
export { POST } from "@core/app/api/<path>/route";
```

Use the actual methods from the core route. Examples:

```ts
export { GET } from "@core/app/api/search-proxy/route";
export { GET, POST } from "@core/app/api/paypal-app/api/trpc/[...procedure]/route";
export { GET, POST, DELETE } from "@core/app/api/cart-session/route";
```

If a tenant already has a local implementation for a core API route, treat it as suspicious. Replace stale copies with a one-line `@core` export. Keep a tenant-local API implementation only when it is truly tenant-specific, reconciled with the auth/security rules, and explicitly listed in the progress notes and PR.

Current post-review wrapper additions found by this audit:

- `src/app/api/braintree/get-config/route.ts`
- `src/app/api/braintree/transaction-initialize/route.ts`
- `src/app/api/page-update/route.ts`
- `src/app/api/products-update/route.ts`
- `src/app/api/shipping-estimate/route.ts`

Observed route-export hot spots from the latest tenant audit:

- `braintree/get-config` and `braintree/transaction-initialize` were missing in 35 blocked tenants.
- `shipping-estimate` was missing in 31 blocked tenants.
- `viralsweep/get-config` was missing in 30 blocked tenants.
- `checkout/tiered` was missing in 28 blocked tenants.

These counts are triage hints only. Always run the complete `comm -23` route comparison after moving `core` to `staging`, because tenants with stale, uninitialized, or non-staging `core` submodules may show a different route set after preflight is fixed.

### 2.2 Flag GraphQL query and mutation overrides

Tenant overrides should normally be UI-related. GraphQL query, mutation, and helper overrides are data-layer overrides and must be flagged even when they appear harmless.

List all tenant-local query and mutation files:

```bash
find src/graphql/queries src/graphql/mutations -type f 2>/dev/null | sort
```

Classify query/mutation overrides:

```bash
# Tenant files that shadow core query/mutation files.
comm -12 <(git ls-files src/graphql/queries src/graphql/mutations | sort) <(git -C core ls-files src/graphql/queries src/graphql/mutations | sort)

# Tenant-only query/mutation files.
comm -23 <(git ls-files src/graphql/queries src/graphql/mutations | sort) <(git -C core ls-files src/graphql/queries src/graphql/mutations | sort)
```

Record every file from both commands in the progress notes and PR checklist. Do not silently edit these files. Preferred outcomes:

- delete or replace stale core copies so the tenant inherits `core`
- move tenant-specific data needs into `core` only after separate review
- keep tenant-only data files only when the tenant has a documented schema/content requirement and the file passes the security grep gates

Any query/mutation override that imports Apollo, uses legacy auth headers, changes checkout/payment/auth behavior, or works around core data contracts is a migration risk. Flag it in the migration notes before implementation continues.

### 2.3 Find server-client usage

```bash
rg -n "createApolloServerClient|graphql/server-client|\\.\\./server-client" src
```

Any hit in tenant `src/` must be reconciled. Common locations are homepage/showroom components, sitemaps, tenant-local query modules, custom category/product pages, and one-off action files.

### 2.4 Find client-side Apollo usage

Server-side `createApolloServerClient` migration is only part of the Apollo removal. The first tenant attempt showed that client-side account, cart, product detail, checkout, and related UI flows can still fail the build after server data files have been migrated.

Run:

```bash
rg -n "@apollo/client|ApolloClient|ApolloProvider|useApolloClient|useQuery|useMutation|useLazyQuery|__APOLLO_CLIENT__|clearStore|graphql/client|ApolloWrapper" src package.json
```

Classify every hit:

- `@apollo/client`, `ApolloProvider`, `useApolloClient`, `new ApolloClient`, `HttpLink`, `InMemoryCache`, `__APOLLO_CLIENT__`, `clearStore`, `graphql/client`, and `ApolloWrapper` must be removed.
- `useQuery`, `useMutation`, and `useLazyQuery` are unsafe only when imported from Apollo. Replace those with the core fetch-only hooks.
- GraphQL document files should keep only `gql` from `@/graphql/gql`.

If this command returns tenant-local client files and the agent cannot finish the hook migration in the same pass, mark the tenant `blocked` with the full file list. Do not remove `@apollo/client` from dependencies without also removing every tenant-local Apollo import.

### 2.5 Find auth-token and sensitive-log patterns

```bash
rg -n "console\\.log\\(req\\)|localStorage\\.(getItem|setItem)\\(['\\\"](token|refreshToken)['\\\"]\\)|Authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)|authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)" src
```

Treat these as high-priority:

- `console.log(req)`
- logging full request bodies, headers, payment payloads, tokens, or GraphQL responses
- `localStorage.getItem("token")`, `localStorage.setItem("token")`, and refresh-token equivalents
- direct customer-token `Authorization: Bearer ...` or `Authorization: JWT ...` in tenant-local API/client code

### 2.6 Review highest-risk tenant overrides

Check these paths first if they exist locally:

- `src/graphql/client.ts`
- `src/graphql/fetch-client.ts`
- `src/graphql/server-client.ts`
- `src/graphql/queries/*`
- `src/app/api/graphql/route.ts`
- `src/app/api/auth/**/route.ts`
- `src/app/api/cart-session/route.ts`
- `src/app/api/viralsweep/get-config/route.ts`
- `src/app/api/paypal-app/api/trpc/[...procedure]/route.ts`
- `src/app/api/paypal/**/route.ts`
- `src/app/api/affirm/**/route.ts`
- `src/app/api/braintree/**/route.ts`
- `src/app/api/checkout/tiered/route.ts`
- `src/middleware.ts`
- `src/lib/auth/**`
- `src/lib/payment-app/**`
- `src/lib/saleor/**`
- `src/lib/trpc-client.ts`
- `src/store/useGlobalStore.tsx`
- `src/hooks/useTokenExpiration.ts`
- `src/app/category/[slug]/page.tsx`
- `src/app/search/layout.tsx`
- `src/app/bundles/page.tsx`
- `src/app/bundles/[slug]/page.tsx`
- `src/app/(auth)/account/login/page.tsx`
- `src/app/(auth)/account/register/page.tsx`
- `src/app/(auth)/account/reset-password/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/components/checkout/**`
- `src/app/components/homepage/**`
- `src/app/components/showroom/**`
- `src/sitemaps/**`

### 2.7 Classify each file

| Classification | Action |
|---|---|
| No tenant override | No wrapper change; inherit from `core` |
| Tenant UI override with no unsafe/security divergence | Usually keep as-is after build and grep gates |
| Tenant GraphQL query/mutation/helper override | Flag in progress notes and PR; prefer deleting stale copies or moving required data behavior into `core` after review |
| Tenant API route override | Replace with a one-line `@core` export unless it is truly tenant-specific and documented |
| Tenant override imports `createApolloServerClient` | Replace with `fetchGraphQL` or a core helper |
| Tenant override imports `@apollo/client` | Replace with the core fetch-only GraphQL helpers or remove the stale override |
| Tenant override reads/writes JWTs in `localStorage` | Reconcile to cookie-backed `/api/graphql`, `/api/auth/session`, and store flow |
| Tenant override manually builds customer auth headers | Reconcile to `saleorGraphQLJson`, `fetchSaleorWithAuth`, or payment helpers |
| Tenant override logs sensitive request/payment/auth details | Remove or replace with bounded non-sensitive logs |

---

## Phase 3: Reconcile Tenant Files

Only update tenant-local files that actually override the new `core` behavior.

### 3.1 Port required wrapper route exports

Before deeper reconciliation, add the wrapper-level `@core` route exports from the reference wrapper commits:

- auth login/session/set-password
- auth clear/clear-cookies/set when missing or stale
- cart-session
- graphql proxy
- PayPal app TRPC proxy
- Viralsweep get-config when relevant
- checkout tiered
- PayPal, Affirm, and Braintree routes when the tenant supports those payment methods or inherits the core checkout UI
- bundles pages when not locally overridden

These files are needed because App Router route discovery happens in the wrapper app tree. Updating only the `core` submodule is not enough.

Then run the full API route inventory from Phase 2.1. Add a one-line wrapper re-export for every missing `core/src/app/api/**/route.ts` file unless the route is intentionally skipped and documented. Do not stop at the named auth/payment list; that list is only the highest-risk subset.

Route export files should stay intentionally boring. For example:

```ts
export { POST } from "@core/app/api/graphql/route";
```

Do not add wrapper-side logic to these route files unless the tenant has a documented tenant-specific requirement.

### 3.1.1 Data-layer override rule

Tenant migrations should not introduce or preserve data-layer behavior differences by default.

- UI overrides are acceptable when they preserve core data contracts.
- GraphQL query/mutation/helper overrides must be flagged.
- API route overrides must be replaced with `@core` re-exports unless truly tenant-specific.
- Tenant-specific data behavior should be moved into `core` through a separate reviewed change, not hidden in one tenant migration.

If an agent finds a query/mutation override and cannot prove it is tenant-specific and safe, the agent should leave a note and avoid broad rewrites. The migration PR should make the risk visible.

### 3.1.2 Documenting tenant-specific exceptions

A tenant-local data-layer or API behavior can remain only when it is both necessary and reconciled with the security/auth rules.

For every retained exception, record this in the progress row and PR:

- file path
- why core behavior is insufficient for this tenant
- which tenant feature or schema/content difference requires the local behavior
- proof that the file has no Apollo import, no `localStorage` token usage, no manual Bearer/JWT customer header, and no sensitive logging
- whether the exception should be moved into `core` in a follow-up

Do not use "tenant-specific" as a placeholder. If the reason cannot be stated concretely, treat the file as a stale override and reconcile it with `core`.

### 3.2 Reconcile package and environment metadata

Ensure tenant metadata matches the wrapper reference branch:

- `.env.example` includes `SESSION_COOKIE_SECRET`.
- `package.json` includes `@saleor/auth-sdk`.
- `package.json` does not include `@apollo/client`.
- `package.json` does not include direct `graphql` unless a tenant has a documented non-Apollo use.
- `jwt-decode` is removed only after all tenant-local imports are gone.
- lockfiles are updated with the tenant's normal package manager.

Dependency sequencing:

1. Add `@saleor/auth-sdk` and `SESSION_COOKIE_SECRET` early, because middleware and session-cookie code need them.
2. Migrate tenant-local Apollo/server-client imports before removing `@apollo/client`. Removing the dependency first creates noisy build failures and can hide the real migration work.
3. Remove direct `graphql` only after tenant code no longer imports `DocumentNode`, `print`, or Apollo document helpers from that package.
4. Remove `jwt-decode` only after `src/middleware.ts`, `src/hooks/useTokenExpiration.ts`, and any tenant-local auth helper no longer imports it.
5. Update only lockfiles already tracked by the tenant. If both `package-lock.json` and `yarn.lock` are tracked, keep both consistent; if only one is tracked, do not introduce the other.

After dependency edits, re-run the Apollo and `jwt-decode` grep gates before install/build. A clean manifest with stale imports is not a valid migration state.

### 3.3 Reconcile middleware

`src/middleware.ts` is a required reconciliation point when the tenant has any local middleware.

Keep tenant-specific behavior, but update auth handling to the wrapper reference pattern:

- use SDK cookie names via `getSdkStorageKey`
- normalize `NEXT_PUBLIC_API_URL` with a trailing `/graphql/`
- treat access or refresh SDK cookies as an authenticated attempt for route protection
- refresh missing access cookies from the SDK refresh cookie with `refreshSaleorAuthTokens`
- write refreshed cookies with `setRefreshedAuthCookies`
- preserve safe non-production debug headers without token values

Remove old middleware auth code:

- `jwtDecode` token expiry checks
- `token` and `refreshToken` cookie name reads
- Saleor validation requests with `Authorization: JWT ${token}`
- legacy `setAuthCookies` or `refreshSaleorToken` imports

### 3.4 Replace Apollo with fetch-only GraphQL

For unauthenticated server reads, use:

```ts
import { fetchGraphQL } from "@/graphql/fetch-client";
```

Convert:

```ts
const client = createApolloServerClient();
const result = await client.query({ query: SOME_QUERY, variables });
const value = result.data?.value;
```

to:

```ts
const data = await fetchGraphQL<{ value: ValueType }>(
  SOME_QUERY,
  variables,
  { revalidate: 3600 },
);
const value = data?.value;
```

Use these cache defaults:

- CMS, menu, site info, homepage/showroom, newsletter, social links: `{ revalidate: 3600 }`
- product page data: `{ revalidate: 3600, tags: [`PRODUCT:${slug}`] }`
- dynamic page by slug: `{ revalidate: 3600, tags: [`PAGE:${slug}`] }`
- old slug scans, auth-specific reads, checkout/payment requests: `{ revalidate: false }` or route-specific `cache: "no-store"`

Do not add ad hoc timeout wrappers unless the tenant already has a tenant-specific reason and the build still passes.

For client-side GraphQL, tenant-local code must use the core fetch-only layer:

```ts
import { gql } from "@/graphql/gql";
import { graphqlRequest, clearGraphQLCache } from "@/graphql/request";
import {
  useGraphQLQuery,
  useGraphQLMutation,
  useLazyGraphQLQuery,
} from "@/graphql/hooks";
```

Do not preserve:

- `ApolloProvider`
- `src/graphql/client.ts`
- `@apollo/client` imports
- `useQuery`, `useMutation`, `useLazyQuery`, or `useApolloClient` from Apollo
- `client.query`, `client.mutate`, `new ApolloClient`, `HttpLink`, or `InMemoryCache`
- `window.__APOLLO_CLIENT__` or `clearStore()`

The auto-city first-pass migration removed server-side Apollo and package dependencies, but still had 18 client-side Apollo import files and failed the build. For every tenant, finish the client hook migration before considering the dependency removal complete.

Replace common Apollo patterns:

```ts
import { useQuery } from "@apollo/client";
const { data, loading, error, refetch } = useQuery<QueryData>(QUERY, { variables });
```

with:

```ts
import { useGraphQLQuery } from "@/graphql/hooks";
const { data, loading, error, refetch } = useGraphQLQuery<QueryData>(QUERY, { variables });
```

Do not keep Apollo-style `context.headers` when moving to the core fetch hook. The fetch-only request layer reads top-level `headers`.

Convert:

```ts
const { data } = useQuery<GetChannelsData>(GET_CHANNELS, {
  context: {
    headers: {
      ...(dealerToken && { "Authorization-Bearer": dealerToken }),
    },
  },
});
```

to:

```ts
const { data } = useGraphQLQuery<GetChannelsData>(GET_CHANNELS, {
  headers: {
    ...(dealerToken && { "Authorization-Bearer": dealerToken }),
  },
});
```

This is a common locator/dealer page issue. If the tenant has `useGraphQLQuery(..., { context: { headers } })`, the token is silently ignored unless core has explicit compatibility code for that shape. Prefer the top-level `headers` form in tenant migrations.

Convert imperative GraphQL calls:

```ts
const { data } = await client.mutate({ mutation: MUTATION, variables });
```

to:

```ts
const data = await graphqlRequest<ResultType>(MUTATION, variables);
```

Do not replace Apollo imperative calls with direct `fetch(NEXT_PUBLIC_API_URL)` plus a browser token. Use the cookie-backed local GraphQL route through `graphqlRequest`, which sends SDK auth cookies with `credentials: "include"`.

Convert PDP/client code like:

```ts
const token = localStorage.getItem("token");
const res = await fetch(resolveEndpoint(), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
  body: JSON.stringify({
    query: UPDATE_CHECKOUT_LINE_METADATA,
    variables: { id: checkoutLineId, input: metadata },
  }),
});
```

to:

```ts
await graphqlRequest(UPDATE_CHECKOUT_LINE_METADATA, {
  id: checkoutLineId,
  input: metadata,
});
```

For read-after-write checkout lookups in client components, use the same pattern:

```ts
const data = await graphqlRequest<GetCheckoutLinesData>(GET_CHECKOUT_LINES, {
  id: checkoutId,
});
const checkoutLines = data.checkout?.lines ?? [];
```

The tenant should not call the public Saleor GraphQL endpoint from the browser for customer-aware operations. Those calls bypass the SDK cookie proxy and recreate the old `localStorage` token problem.

GraphQL query and mutation constants should import the local helper:

```ts
import { gql } from "@/graphql/gql";
```

not:

```ts
import { gql } from "@apollo/client";
```

### 3.4.1 Common blocked-file recipes

The read-only tenant audit found the same file families repeatedly. Use these recipes before inventing a tenant-specific migration.

| Repeated file family | Preferred migration |
|---|---|
| `src/app/product/[id]/ProductDetailClient.tsx` or tenant PDP page/client files | Replace Apollo hooks with `useGraphQLQuery`; replace direct browser `fetch(NEXT_PUBLIC_API_URL)` plus `localStorage.getItem("token")` with `graphqlRequest`; remove `Authorization: Bearer ...` headers |
| `src/app/components/checkout/AddressInformationSection.tsx` | Replace Apollo `useQuery` with `useGraphQLQuery`; keep the same variables and `skip` condition; do not pass Apollo `context` |
| `src/app/hooks/useDealerLocations.ts` and locator/store-locator files | Replace Apollo `useQuery(GET_CHANNELS, ...)` with `useGraphQLQuery`; move dealer headers to the top-level `headers` option only when a tenant-specific dealer token is still required and safe |
| newsletter clients and showroom/homepage client components | Replace Apollo hooks with `useGraphQLQuery`; most CMS/newsletter reads should not need auth headers |
| `src/sitemaps/**` and server homepage/showroom components | Replace `createApolloServerClient().query(...)` with `fetchGraphQL(..., { revalidate: 3600 })` or the route-specific cache setting |
| `src/graphql/queries/getAboutUs.ts`, `getAddressInformation.ts`, `getNewsletterPage.ts`, and similar tenant query modules | Change `gql` imports to `@/graphql/gql`; delete stale copies or re-export core where the tenant does not have a real schema/content difference |
| `src/lib/trpc-client.ts` and account payment method files | Remove `localStorage.getItem("token")` and `Authorization: Bearer ...`; route through core payment/auth helpers or local cookie-backed routes |

For `useGraphQLQuery`, keep the migration mechanically close to Apollo:

```ts
const { data, loading, error, refetch } = useGraphQLQuery<Data, Variables>(
  QUERY,
  {
    variables,
    skip,
    fetchPolicy: "cache-and-network",
  },
);
```

For imperative client mutations or reads, prefer:

```ts
const data = await graphqlRequest<Data, Variables>(QUERY_OR_MUTATION, variables);
```

`graphqlRequest` already sends SDK cookies to `/api/graphql` with `credentials: "include"` by default. Adding browser token headers is a regression.

### 3.5 Reconcile auth flow

Tenant-local auth code must follow the core pattern:

- sign in through `/api/auth/login`
- reset password through `/api/auth/set-password`
- check session through `/api/auth/session`
- clear session through `/api/auth/clear`
- keep `/api/auth/clear-cookies` as a redirect helper that calls core SDK sign-out
- keep `/api/auth/set` as the core 410 response; do not preserve manual token-setting behavior
- use `credentials: "include"` for same-origin auth calls
- do not persist access or refresh tokens in `localStorage`

If a tenant overrides `src/graphql/client.ts`, delete the stale override unless it is a one-line compatibility file explicitly reviewed against core. Core no longer has an Apollo client file. Auth/session GraphQL errors are handled in `@/graphql/request`, which clears the GraphQL cache, calls `/api/auth/clear`, and redirects to login/session-expired.

For tenant PDP/account/cart/client code, this means:

```ts
// Do not do this.
const token = localStorage.getItem("token");
headers.Authorization = `Bearer ${token}`;
```

Use:

```ts
await graphqlRequest(QUERY_OR_MUTATION, variables);
```

The SDK cookies are sent by the local `/api/graphql` flow. No component should manually read access or refresh tokens.

### 3.6 Reconcile cart session persistence

Tenant-local cart/checkout store code should not rely on localStorage for `checkoutId`, `checkoutToken`, or selected shipping method as the source of truth.

Use the core route:

- `GET /api/cart-session`
- `POST /api/cart-session`
- `DELETE /api/cart-session`

The cookie route requires `SESSION_COOKIE_SECRET` in production. Do not duplicate the signing logic in tenant files.

Convert checkout-session persistence like:

```ts
localStorage.setItem("checkoutId", checkoutId);
if (checkoutToken) localStorage.setItem("checkoutToken", checkoutToken);
```

to the tenant's core-compatible store/helper path that calls:

```ts
await fetch("/api/cart-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ checkoutId, checkoutToken }),
});
```

Convert checkout cleanup like:

```ts
localStorage.removeItem("checkoutId");
localStorage.removeItem("checkoutToken");
```

to:

```ts
await fetch("/api/cart-session", {
  method: "DELETE",
  credentials: "include",
});
```

Prefer existing `useGlobalStore` actions when they already call `/api/cart-session`; do not duplicate route calls in components if a core store action exists.

### 3.7 Reconcile payment and checkout API routes

For Saleor GraphQL calls that need current customer auth, use:

```ts
import { saleorGraphQLJson } from "@/lib/saleor/graphql";
```

For payment app request headers, use:

```ts
import { getPaymentAppRequestHeaders } from "@/lib/payment-app/headers";
```

Do not manually read `request.cookies.get("token")` and construct:

- `Authorization: Bearer ${token}`
- `Authorization: JWT ${token}`

For tiered checkout, preserve the app-token proxy behavior from core. Do not log request objects or token-bearing payloads.

Payment route handling by tenant:

| Tenant state | Action |
|---|---|
| No local payment route and payment method not used | No wrapper change |
| No local payment route but payment method is used by core checkout UI | Add the matching one-line `@core` route export |
| Local payment route is already a one-line `@core` export | Keep it |
| Local payment route has tenant-specific logic | Reconcile auth/header/logging patterns manually |
| Local payment route is only a stale copy of core | Replace it with a one-line `@core` export |

### 3.8 Reconcile logging

Allowed logs:

- bounded route names
- response status codes
- error counts
- non-sensitive error codes
- revalidation tags and slugs

Not allowed:

- `console.log(req)`
- full request objects
- cookies
- authorization headers
- JWTs or refresh tokens
- full payment payloads
- full GraphQL response bodies from payment/auth routes

### 3.9 Remove tenant Apollo/server-client files

If a tenant has `src/graphql/server-client.ts`, delete it after all imports are removed.

If a tenant has `src/graphql/client.ts` that exists only for Apollo, delete it after all imports are removed.

If a tenant has `src/app/components/providers/ApolloWrapper.tsx`, delete it and remove the wrapper from `src/app/layout.tsx`.

Do not keep a compatibility shim. A shim hides missed call sites and can reintroduce token/header behavior the audit is removing.

---

## Phase 4: Validation

Run validation in every tenant.

### 4.1 Install if needed

If dependencies changed, refresh every lockfile already tracked by the tenant before running a frozen/CI install. Do not create a new lockfile format.

```bash
if git ls-files --error-unmatch yarn.lock >/dev/null 2>&1; then
  yarn install
fi

if git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
  npm install --package-lock-only
fi
```

Then run the tenant's normal install verification:

```bash
if test -f yarn.lock; then
  yarn install --frozen-lockfile
elif test -f package-lock.json; then
  npm ci
else
  npm install --no-package-lock
fi
```

Only update lockfiles if the install/build requires it and the dependency change is clearly tied to the core security/auth rollout. If `package.json` did not change, prefer the frozen/CI install directly.

Apollo removal is a dependency change tied to this rollout. Tenant lockfiles must no longer include a root `@apollo/client` dependency after tenant-local Apollo imports are removed.

If a tenant tracks both `yarn.lock` and `package-lock.json`, update both after changing dependencies. Do not add a new lockfile format to a tenant that does not already track it.

If the build fails after the server-side `fetchGraphQL` migration, check client-side Apollo imports before investigating unrelated issues. A known first-tenant blocker was account/cart/product UI files still importing Apollo hooks.

### 4.2 Build

```bash
if test -f yarn.lock; then
  yarn build
else
  npm run build
fi
```

Fix tenant-local compile failures introduced by masked overrides. Do not chase unrelated pre-existing failures unless they block verification; record them as blockers.

### 4.3 Security grep gates

These should return no tenant-local unsafe hits:

```bash
rg -n "createApolloServerClient|graphql/server-client|\\.\\./server-client" src
rg -n "@apollo/client|ApolloClient|ApolloProvider|useApolloClient|useQuery|useMutation|useLazyQuery|__APOLLO_CLIENT__|clearStore|graphql/client|ApolloWrapper" src package.json
rg -n "from ['\\\"]@apollo/client['\\\"]" src/graphql src/app
rg -n "console\\.log\\(req\\)" src
rg -n "localStorage\\.(getItem|setItem)\\(['\\\"](token|refreshToken)['\\\"]\\)" src
rg -n "Authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)|authorization\\s*:\\s*[`'\\\"]?(Bearer|JWT)" src
rg -n "jwtDecode|from ['\\\"]jwt-decode['\\\"]|cookies\\.get\\(['\\\"](token|refreshToken)['\\\"]\\)" src/middleware.ts src
find src/lib/auth src/lib/saleor src/lib/payment-app -type f 2>/dev/null
```

If a grep hit is intentionally safe, document why in the progress notes and PR body.

The final `find src/lib/...` command is a prompt to review tenant-local helper shadows, not an automatic failure. Any local auth, Saleor, or payment helper must be equivalent to the reviewed core helper or removed/replaced with core behavior.

### 4.4 Wrapper export gates

First verify complete API route discovery. This should return no output unless a missing route is intentionally skipped and documented:

```bash
route_tmp="$(mktemp -d)"
trap 'rm -rf "$route_tmp"' EXIT
find core/src/app/api -name route.ts -type f | sed 's#^core/##' | sort > "$route_tmp/core-api-routes"
find src/app/api -name route.ts -type f | sort > "$route_tmp/wrapper-api-routes"
comm -23 "$route_tmp/core-api-routes" "$route_tmp/wrapper-api-routes"
```

If the command prints any route, add the wrapper re-export before continuing.

Then verify required local wrapper exports exist unless the tenant intentionally overrides that route/page:

```bash
test -f src/app/api/auth/login/route.ts
test -f src/app/api/auth/session/route.ts
test -f src/app/api/auth/set-password/route.ts
test -f src/app/api/auth/clear/route.ts
test -f src/app/api/auth/clear-cookies/route.ts
test -f src/app/api/auth/set/route.ts
test -f src/app/api/cart-session/route.ts
test -f src/app/api/graphql/route.ts
test -f src/app/api/checkout/tiered/route.ts
test -f src/app/api/paypal-app/api/trpc/[...procedure]/route.ts
test -f src/hooks/useTokenExpiration.ts
```

For tenants using Viralsweep or bundle pages, also verify:

```bash
test -f src/app/api/viralsweep/get-config/route.ts
test -f src/app/bundles/page.tsx
test -f src/app/bundles/[slug]/page.tsx
```

For payment providers enabled by the tenant or exposed by the tenant checkout UI, also verify:

```bash
test -f src/app/api/paypal/get-config/route.ts
test -f src/app/api/paypal/create-order/route.ts
test -f src/app/api/paypal/capture-order/route.ts
test -f src/app/api/affirm/get-config/route.ts
test -f src/app/api/affirm/create-checkout/route.ts
test -f src/app/api/affirm/process-payment/route.ts
test -f src/app/api/affirm/check-status/route.ts
test -f src/app/api/affirm/test-connection/route.ts
test -f src/app/api/braintree/get-config/route.ts
test -f src/app/api/braintree/transaction-initialize/route.ts
```

Confirm wrapper discovery files are re-exports, not stale local implementations:

```bash
sed -n '1,5p' src/app/api/auth/login/route.ts
sed -n '1,5p' src/app/api/auth/session/route.ts
sed -n '1,5p' src/app/api/auth/set-password/route.ts
sed -n '1,5p' src/app/api/auth/clear/route.ts
sed -n '1,5p' src/app/api/auth/clear-cookies/route.ts
sed -n '1,5p' src/app/api/cart-session/route.ts
sed -n '1,5p' src/app/api/graphql/route.ts
sed -n '1,5p' src/app/api/checkout/tiered/route.ts
sed -n '1,5p' src/app/api/page-update/route.ts
sed -n '1,5p' src/app/api/products-update/route.ts
sed -n '1,5p' src/app/api/shipping-estimate/route.ts
sed -n '1,5p' src/hooks/useTokenExpiration.ts
```

Check stale re-export removal:

```bash
rg -n "export \\{ default, dynamic, generateMetadata \\} from ['\\\"]@core/app/category/\\[slug\\]/page|export \\{ default, metadata \\} from ['\\\"]@core/app/search/layout" src
```

That final command should return no hits.

### 4.5 Data override gates

Generate the tenant data override report:

```bash
find src/graphql/queries src/graphql/mutations -type f 2>/dev/null | sort
comm -12 <(git ls-files src/graphql/queries src/graphql/mutations | sort) <(git -C core ls-files src/graphql/queries src/graphql/mutations | sort)
comm -23 <(git ls-files src/graphql/queries src/graphql/mutations | sort) <(git -C core ls-files src/graphql/queries src/graphql/mutations | sort)
comm -12 <(git ls-files src/graphql/client.ts src/graphql/fetch-client.ts src/graphql/gql.ts src/graphql/hooks.ts src/graphql/request.ts src/graphql/server-client.ts 2>/dev/null | sort) <(git -C core ls-files src/graphql/client.ts src/graphql/fetch-client.ts src/graphql/gql.ts src/graphql/hooks.ts src/graphql/request.ts src/graphql/server-client.ts 2>/dev/null | sort)
```

If any command returns query/mutation/helper files, copy the list into progress notes and the PR body. This is not automatically a build blocker, but it is a migration risk that reviewers must see.

### 4.6 Dependency and env gates

```bash
rg -n '"@saleor/auth-sdk"' package.json
! rg -n '"@apollo/client"|"graphql"' package.json
! rg -n '@apollo/client' package-lock.json yarn.lock 2>/dev/null
rg -n '^SESSION_COOKIE_SECRET=' .env.example
git -C core rev-parse HEAD
git submodule status
```

If `jwt-decode` remains in `package.json`, confirm there is still a tenant-local non-middleware import that needs it. Otherwise remove it and update the lockfile.

If direct `graphql` remains in `package.json`, confirm there is still a documented non-Apollo use. The reviewed core fetch-only migration removed the direct dependency because app code no longer imports `DocumentNode` or `print`.

The `core` submodule should be on `staging`; record the exact SHA from `git -C core rev-parse HEAD` in the PR. Use the Phase 1.4 submodule evidence commands to prove the committed wrapper gitlink matches the checked-out `core` SHA.

### 4.7 Functional smoke test

At minimum, verify:

- homepage CMS/showroom sections render
- category page renders
- search page renders
- bundles list/detail pages render if enabled for the tenant
- product page renders
- login succeeds
- logout clears session
- register and reset-password routes do not store tokens in localStorage
- protected account route redirects correctly when logged out
- auth routes redirect home when the SDK access cookie or refreshed session exists
- guest add-to-cart persists after reload
- logged-in add-to-cart persists after reload
- checkout reload preserves cart session
- tiered checkout route works for price override items
- PayPal, Affirm, and Braintree config/init routes return expected non-secret responses where enabled
- Viralsweep config route returns expected non-secret response where enabled

### 4.8 Pull request checklist

Each tenant PR should include:

- original `core` SHA
- new `core` SHA
- evidence that committed wrapper gitlink matches checked-out `core` SHA
- wrapper reference commits ported or intentionally skipped
- outcome classification
- files reconciled
- build result
- security grep result
- wrapper export/dependency gate result
- complete API route discovery result
- GraphQL query/mutation/helper override report
- any tenant-specific skipped or blocked items

Suggested PR title:

```text
fix: migrate security auth and graphql fetch handling
```

Suggested commit:

```bash
git commit -m "fix: migrate storefront security auth and graphql fetch"
```

### 4.9 Rollout completion criteria

The rollout is complete only when the progress tracker proves every in-scope tenant is either `done` or intentionally `skipped`.

Run this from the rollout workspace:

```bash
awk -F'|' '/^\\|/ && $2 !~ /Tenant|---/ {gsub(/^ +| +$/, "", $3); count[$3]++} END {for (s in count) print s, count[s]}' agents/playbooks/security_auth_migration_progress.md | sort
grep -nE '\\| (pending|in-progress|blocked) \\|' agents/playbooks/security_auth_migration_progress.md
```

The first command should report only `done` and, if applicable, `skipped`. The second command should return no rows.

Do not treat `0 pending` as completion. A tracker with `blocked` rows still represents unresolved tenant migrations.

---

## Tenant Inventory

Initial local discovery found these 45 tenant repos under `../storefront`. This table is an inventory seed only. The current rollout state lives in `agents/playbooks/security_auth_migration_progress.md`.

| Tenant | Initial Status | Notes |
|---|---|---|
| auto-city-classic-storefront-v2 | pending | - |
| auto-shafts-storefront | pending | - |
| baja-kits-storefront | pending | - |
| big-country-mexico-storefront | pending | - |
| big-dog-aftermarket-storefront | pending | - |
| bmc-truck-storefront | pending | - |
| body-kits-storefront | pending | - |
| caltric-storefront | pending | - |
| camlocker-storefront | pending | - |
| classic-tube-storefront | pending | - |
| clutch-masters-storefront | pending | - |
| connector-experts-storefront | pending | - |
| dales-super-store-storefront | pending | - |
| dana-aftermarket-storefront-v2 | pending | - |
| dans-diesel-performance-storefront | pending | - |
| diversified-shafts-solutions-storefront | pending | - |
| east-coast-gear-supply-storefront-v2 | pending | - |
| exhaust-factory-storefront-v2 | pending | - |
| extreme-metal-products-storefront | pending | - |
| foose-performance-storefront-v2 | pending | - |
| fuelab--storefront-v2 | pending | - |
| gibson-performance-storefront | pending | - |
| granatelli-motorsports-storefront | pending | - |
| heavy-duty-pros-hdp-storefront-v2 | pending | - |
| inglewood-transmission-storefront | pending | - |
| jess-performance-storefront-v2 | pending | - |
| katech-engines-storefront | pending | - |
| kermatdi-storefront | pending | - |
| kt-performance-storefront | pending | - |
| lincoln-diesel-specialties-storefront | pending | - |
| rare-electrical-storefront | pending | - |
| shifted-industries-storefront | pending | - |
| socal-powersports-storefront | pending | - |
| sparktec-motorsports-storefront | pending | - |
| sprocket-center-storefront | pending | - |
| stowe-cargo-storefront | pending | - |
| suncoast-diesel-storefront | pending | - |
| sunton-storefront | pending | - |
| titan-truck-storefront | pending | - |
| trails-end-truck-storefront | pending | - |
| tre-performance-storefront | pending | - |
| truck-outlaw-storefront | pending | - |
| underdog-diesel-storefront | pending | - |
| upr-storefront | pending | - |
| west-coast-metric-storefront | pending | - |

---

## Assumptions and Defaults

- All tenant work starts from `main` unless a tenant-specific base is documented before claiming it.
- The implementation source of truth is the current `core` branch `staging`; record the exact SHA used for each tenant rollout.
- `SESSION_COOKIE_SECRET` must be configured in production for signed cart-session cookies.
- Tenant-specific branding, layout, and copy are preserved unless they directly conflict with the security/auth migration.
- Any repo that lacks the expected Next/Saleor wrapper shape should be marked `skipped`, not force-migrated.
