# Security Policy — Millet Jar Website

## Architecture

| Area | Customer | Admin |
| --- | --- | --- |
| Endpoint | `/api/auth/*` | `/api/admin/auth/*` |
| Login | Email/user ID + password, or Google OAuth 2.0 (code + PKCE) | Supabase Auth (email + password) |
| Cookie | `mj_session` (httpOnly, SameSite=Lax) | `mj_admin_session` (httpOnly, SameSite=Strict) |
| Session store | `db.sessions` | `db.adminSessions` |
| Secret | `AUTH_SECRET` | `ADMIN_AUTH_SECRET` (different value) |
| Lifetime | 7 days, sliding | 2 hours |

The two systems share no cookies, no tokens, no session table and no secret. A valid customer session cannot reach any admin endpoint, and an admin session cannot act as a customer.

## Controls implemented

**Authentication**

- Password login accepts either the email address or the `usr_...` account ID. Failures are generic and still run one scrypt verification against a dummy hash.
- Password hashes use scrypt with a per-account random salt; plaintext passwords are never stored.
- Self-signup is disabled in production until an email-verification flow is added. Production accounts are admin-provisioned.
- Google OAuth uses PKCE (S256) and a single-use `state` bound to an httpOnly cookie. The callback requires a matching state cookie, an unexpired server-side state record (< 10 min), a verified email, and a stable Google `sub`.
- Accounts are matched by Google `sub` first. Email-only matches are linked only for legacy Google accounts; password accounts are never silently taken over.
- New session token on every login; only the SHA-256 hash of the token is stored server-side. Sessions have absolute expiry and are pruned and revoked on sign-out.
- Maximum 5 active customer sessions; admin role is re-checked on every request so revocation takes effect immediately.
- Development sign-in (`/api/auth/dev-login`) returns 404 in production.

**Per-request verification**

Every protected route calls `guardUser()` / `guardAdmin()` (`lib/guard.ts`), which:

1. applies a per-IP, per-endpoint rate limit;
2. resolves the session server-side and checks expiry;
3. for mutations, verifies the `x-csrf-token` header against the session token in constant time;
4. requires a same-origin `Origin` header on state-changing public endpoints.

Pages (`/account`, `/booking`, `/order/[id]`, `/admin`) perform the same server-side verification before rendering.

**Rate limiting**

- Route limits are backed by Supabase's atomic `mj_rate_limit()` RPC in production, so all instances share counters.
- Behind a trusted proxy the right-most `X-Forwarded-For` entry is used; headers containing non-IP values are ignored. Set `TRUST_PROXY=false` only when directly exposed.
- The edge proxy keeps a coarse best-effort limiter; route guards are authoritative.
- 429 responses include `Retry-After`.

**CSRF**

- Token is issued in a same-origin JSON response (`/api/auth/me`), never in a cookie, and must be echoed in `x-csrf-token`.
- Cookies are `SameSite=Lax` (customer) / `Strict` (admin) as defence in depth.
- Redirects after login accept only local paths; `//`, backslashes and encoded backslashes are rejected.

**Authorization**

- Orders are scoped to `userId`; reading another user's order returns 404 (no existence leak).
- Admin endpoints require the admin session; customer CSRF tokens are rejected with 401.
- Order transitions are forward-only and audit-logged. Cancelling an order restocks reserved units exactly once. Marking an order paid offline never rewinds a shipped/delivered order.

**Input & business logic**

- Zod validation on every request body, including digit-only phone/pincode checks.
- Prices, shipping and totals are recomputed from the current catalog inside the same snapshot as the stock reservation, so a stale read cannot oversell.
- Unknown/out-of-stock products and over-quantity requests return 409 with the reason instead of being silently dropped.
- Client-supplied `requestId` makes order retries idempotent; a network retry returns the original order.
- Customer text is flattened and stripped of WhatsApp formatting markers before it enters the message, preventing fake sections or injected totals.
- Order references use an 8-character random suffix; internal ids are random.

**Ordering**

- WhatsApp is the only order channel. The checkout creates the order, then opens a `wa.me` link containing the full customer and item details.
- No payment gateway SDK, checkout script, intent API, webhook or gateway API key exists in the application.
- No card, UPI, RuPay or net-banking data is collected or transmitted by this application.

**Admin hardening**

- Separate endpoint namespace, cookie, secret and store.
- Credentials are verified by Supabase Auth; the app never stores admin passwords.
- Only users with `role = 'admin'` in `public.users` are authorized (generic "Invalid credentials" otherwise).
- Two-layer lockout: 8 requests / 15 min per IP and 5 failed attempts / 15 min per IP.

**Transport & headers** (`proxy.ts`)

- Content-Security-Policy with a fresh per-request nonce; no `unsafe-inline` scripts or styles.
- `Strict-Transport-Security` (1 year, preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denies camera/microphone/geolocation/payment.
- API responses: `Cache-Control: no-store`, `X-Robots-Tag: noindex`; `/admin`: `noindex, nofollow`.

**Storage & secrets**

- Server-only modules import `server-only`; client bundles cannot accidentally import env, crypto or store code.
- Supabase snapshot writes use compare-and-swap versioning: a stale writer is rejected and retried on a fresh snapshot instead of deleting another request's rows.
- `.env*` files are stripped from the standalone build artifact.
- Production startup (`instrumentation.ts`) fails closed if `APP_URL`, the real WhatsApp number, strong distinct secrets or Supabase configuration are invalid.
- No secret is prefixed `NEXT_PUBLIC_`.

## Production checklist (owner-owned)

- [ ] Rotate the current admin password and any live-looking secrets; remove stale `.env` copies from local machines and CI caches.
- [ ] Set the real `APP_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, distinct 32+ character `AUTH_SECRET` / `ADMIN_AUTH_SECRET`, and Supabase credentials.
- [ ] Add the exact Google Search Console verification token (or Google-named HTML file) you were issued.
- [ ] Replace placeholders in `/privacy`, `/terms` and `/refund` with verified legal/business facts.
- [ ] Remove leftover Supabase test accounts (`alice@example.com`, `bob@example.com`) and provision real password customers.
- [ ] Keep dependencies patched (`npm audit` / Dependabot) and add a WAF/CDN for volumetric protection.
- [ ] Back up Supabase (or `db.json` if you stay in file mode).

## Reporting

Report vulnerabilities privately to **hello@milletjar.in**. Please include reproduction steps and do not open a public issue.
