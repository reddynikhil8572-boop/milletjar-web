# Security Policy — Millet Jar Website

## Architecture

| Area | Customer | Admin |
| --- | --- | --- |
| Endpoint | `/api/auth/*` | `/api/admin/auth/*` |
| Login | Google OAuth 2.0 (code + PKCE) | Email + scrypt password |
| Cookie | `mj_session` (httpOnly, SameSite=Lax) | `mj_admin_session` (httpOnly, SameSite=Strict) |
| Session store | `db.sessions` | `db.adminSessions` |
| Secret | `AUTH_SECRET` | `ADMIN_AUTH_SECRET` (different value) |
| Lifetime | 7 days, sliding | 2 hours |
| CSRF token | per session | per admin session |

The two systems share no cookies, no tokens, no session table and no secret. A valid customer session cannot reach any admin endpoint, and an admin session cannot act as a customer.

## Controls implemented

**Authentication**

- Google OAuth Authorization Code flow with PKCE (S256) and a single-use `state` bound to an httpOnly cookie.
- Callback requires a matching state cookie, an unexpired server-side state record (< 10 min) and a Google-verified email.
- New session token on every login; only the SHA-256 hash of the token is stored server-side.
- Session records carry absolute expiry, are pruned, and are removed on sign-out.
- Maximum 5 active sessions per user (oldest dropped).
- Development sign-in (`/api/auth/dev-login`) returns 404 when `NODE_ENV=production`.

**Per-request verification**

Every protected route calls `guardUser()` / `guardAdmin()` (`lib/guard.ts`), which:

1. applies a per-IP, per-endpoint rate limit;
2. resolves the session server-side and checks expiry;
3. for mutations, verifies the `x-csrf-token` header against the session token in constant time;
4. rejects cross-origin requests (`Origin` must match the app origin).

Pages (`/account`, `/booking`, `/payment`, `/order/[id]`, `/admin`) perform the same server-side verification before rendering.

**CSRF**

- Token is issued in a same-origin JSON response (`/api/auth/me`), never in a cookie, and must be echoed in `x-csrf-token`.
- A cross-site attacker cannot read the response, so cannot forge the header.
- Cookies are `SameSite=Lax` (customer) / `Strict` (admin) as defence in depth.

**Authorization**

- Orders are scoped to `userId`; reading another user's order returns 404 (no existence leak).
- Admin endpoints require the admin session; customer CSRF tokens are rejected with 401.
- Order status transitions and "mark paid" are admin-only and audit-logged.

**Input & business logic**

- Zod validation on every request body.
- Prices, shipping and totals are recomputed from `lib/products.ts`; any client-supplied price is ignored.
- Quantity is clamped per line and per item; unknown/out-of-stock products are dropped.
- Payment amount comes from the stored order, never from the client.
- Order references and internal ids are random.

**Payments**

- Payment intents are created server-side with the provider (Razorpay) using server credentials.
- Webhooks are verified with HMAC-SHA256 over the raw body in constant time.
- Processing is idempotent: replaying an event does not double-process an order.
- Non-success events are ignored.
- Card/UPI data never touches this application.

**Admin hardening**

- Separate endpoint namespace, cookie, secret and store.
- Constant-time comparison for email and password; generic "Invalid credentials" response.
- scrypt password hashing (64-byte key, random salt); plaintext passwords are ignored in production.
- Two-layer lockout: 8 requests / 15 min per IP and 5 failed attempts / 15 min per IP.
- 2-hour session lifetime; sessions revoked on sign-out.

**Transport & headers** (`proxy.ts`)

- Content-Security-Policy (self + Razorpay checkout domains, `frame-ancestors 'none'`, `object-src 'none'`)
- `Strict-Transport-Security` (1 year, preload)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denies camera/microphone/geolocation
- API responses: `Cache-Control: no-store`, `X-Robots-Tag: noindex`
- `/admin`: `X-Robots-Tag: noindex, nofollow`

**Secrets**

- Server-only env vars; no secret is prefixed `NEXT_PUBLIC_`.
- `AUTH_SECRET` / `ADMIN_AUTH_SECRET` fail closed in production (session creation throws if unset).
- `ADMIN_PASSWORD` (plaintext) is ignored when `NODE_ENV=production`.

## Known limitations / production checklist

- [ ] **Persistent storage** — the default JSON store is per-instance and ephemeral on free hosting. Mount a disk (`DATA_DIR`) or migrate to Postgres/Redis.
- [ ] **Shared rate limiting** — the limiter is in-memory; use Redis for multiple instances.
- [ ] **Single admin account** — credentials come from env. Add a DB-backed admin table with per-user roles before adding staff.
- [ ] **No email verification for dev login** — dev login is disabled in production; Google login requires a verified email.
- [ ] **Session revocation on password change** — not applicable for Google login; add a `sessionsValidAfter` field if password login is added.
- [ ] **Set `APP_URL`** in production so OAuth redirect URIs and origin checks are exact.
- [ ] **Rotate secrets** periodically and after any suspected exposure.
- [ ] **Keep dependencies patched** — run `npm audit` / Dependabot.
- [ ] **WAF/CDN** in front of Render/Railway for volumetric protection.
- [ ] **Back up** `db.json` if you keep using the file store.

## Reporting

Report vulnerabilities privately to **hello@milletjar.in**. Please include reproduction steps and do not open a public issue.
