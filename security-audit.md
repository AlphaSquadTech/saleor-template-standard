# WSM 6.0 Storefront Security and Authentication Remediation Plan

This document outlines the strategic plan to address security and authentication vulnerabilities identified in the storefront frontend audit.

## Executive Summary
The storefront audit identified four primary security and authentication issues. The remediation strategy prioritizes immediate mitigation of sensitive data leaks, followed by a structural overhaul of the authentication flow to prevent session desyncs and XSS vulnerabilities.

**Total Estimated Effort:** 9–12 engineer-days.

---

## Detailed Findings & Remediation

### Finding 1: JWT Access Tokens Leaked in Vercel Logs
* **Severity:** High
* **Location:** `core/src/app/api/checkout/tiered/route.ts` (line 13)
* **Description:** A debug statement `console.log(req)` writes full JWT session tokens to Vercel Function Logs on every checkout request. This allows anyone with log access to impersonate users.
* **Required Action:** * Remove the `console.log(req)` statement.
    * Audit the entire codebase for similar patterns and remove any logging of request objects or headers.
    * Coordinate with the WSM team to rotate potentially compromised JWTs.

### Finding 2: Token Refresh Desync (Forced Logouts)
* **Severity:** Critical (Ships with Finding 3)
* **Location:** `core/src/graphql/client.ts`, Server-side middleware
* **Description:** Independent token stores (localStorage for client, httpOnly cookie for server) drift out of sync. Client-side silent refreshes update localStorage but not the cookie, causing the server to log the user out on the next navigation.
* **Required Action:** * Establish the `httpOnly` cookie as the single authoritative token store.
    * Move token refresh logic into the server-side middleware.

### Finding 3: Tokens Stored in localStorage (XSS Risk)
* **Severity:** High (Ships with Finding 2)
* **Location:** `core/src/graphql/client.ts`
* **Description:** Apollo Client reads JWTs from `localStorage`, making them vulnerable to extraction via XSS.
* **Required Action:** * Remove `localStorage` token reads. 
    * Rely on browser-automatic `httpOnly` cookie attachment for same-origin requests.
    * Implement a Next.js API proxy for requests requiring explicit authentication (cross-origin).
    * Migrate cart state (Zustand) to a signed, `httpOnly` cookie-backed session.

### Finding 4: Inconsistent Authorization Header Formats
* **Severity:** Medium
* **Locations:** Payment API routes (`api/paypal/*`, `api/affirm/*`, `api/braintree/*`)
* **Description:** Some routes use `Bearer ${token}` while others use `JWT ${token}`, leading to intermittent failures if payment apps enforce strict validation.
* **Required Action:** * Create a shared GraphQL client factory to standardize the Authorization header format.
    * Refactor all five payment routes to use this factory.

---

## Implementation Roadmap

| Phase | Timeline | Focus | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Day 1 | **Immediate Mitigation** | Fix Finding 1; Codebase audit; Token rotation coordination. |
| **Phase 2** | Days 2–4 | **Auth Planning** | Map all token sites; Design cookie-based migration using Saleor Auth SDK. |
| **Phase 3** | Days 5–9 | **Structural Overhaul** | Implement Findings 2 & 3; Middleware refresh logic; Cart state migration to cookies. |
| **Phase 4** | Days 10–11 | **Payment Standardization** | Fix Finding 4; Build client factory; Refactor payment routes. |
| **Phase 5** | Days 12–13 | **QA & Validation** | Full regression of checkout flows; multi-tab and persistence testing. |

---

## Acceptance Criteria
The remediation is considered complete when:
1.  **Zero Sensitive Logs:** Code search and log inspection confirm no JWTs or Authorization headers are logged.
2.  **No localStorage Tokens:** `localStorage.getItem("token")` and `setItem("token")` are removed from the codebase.
3.  **Single Source of Truth:** The `httpOnly` cookie is the sole authoritative source for sessions.
4.  **Transparent Refresh:** Users can complete checkout across token expiry windows without logout or cart loss.
5.  **Persistent Guest Carts:** Guest carts survive browser restarts and tab closures via cookie-backed sessions (30-day target).
6.  **Unified Payment Headers:** All payment routes use a consistent Authorization header format via a shared factory.

---

## Coordination Notes
* **Token Rotation:** Business decision required on whether to force-logout all sessions or allow natural expiry for potentially exposed tokens.
* **Cart Migration:** Coordination with the partial-SSR team is essential as moving cart state to cookies intersects with their work.
* **SDK Verification:** Ensure `@saleor/auth-sdk` is updated to a version supporting the Next.js cookie adapter before starting Phase 2.
