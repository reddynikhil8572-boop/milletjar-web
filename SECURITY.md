# Security Policy — Millet Jar Website

## Architecture

| Area | Customer | Admin |
| --- | --- | --- |
| Endpoint | `/api/auth/*` | `/api/admin/auth/*` |
| Login | Google OAuth 2.0 (code + PKCE) | Supabase Auth (email + password) |
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

Pages (`/account`, `/booking`, `/order/[id]`, `/admin`) perform the same server-side verification before rendering.

**CSRF**

- Token is issued in a same-origin JSON response (`/api/auth/me`), never in a cookie, and must be echoed in `x-csrf-token`.
- A cross-site attacker cannot read the response, so cannot forge the header.
- Cookies are `SameSite=Lax` (customer) / `Strict` (admin) as defence in depth.

**Authorization**

- Orders are scoped to `userId`; reading another user's order returns 404 (no existence leak).
- Admin endpoints require the admin session; customer CSRF tokens are rejected with 401.
- Order status transitions are admin-only and audit-logged.

**Input & business logic**

- Zod validation on every request body.
- Prices, shipping and totals are recomputed from `lib/products.ts`; any client-supplied price is ignored.
- Quantity is clamped per line and per item; unknown/out-of-stock products are dropped.
- Order totals sent to WhatsApp come from the server-side catalog, never from the client.
- Order references and internal ids are random.

**Ordering**

- WhatsApp is the only order channel. The checkout creates the order, then opens a `wa.me` link containing the full customer and item details.
- No payment gateway SDK, checkout script, intent API, webhook or gateway API key exists in the application.
- No card, UPI, RuPay or net-banking data is collected or transmitted by this application.

**Admin hardening**

- Separate endpoint namespace, cookie, secret and store.
- Credentials are verified by Supabase Auth; the app never stores admin passwords.
- Only users with `role = 'admin'` in `public.users` are authorized (generic "Invalid credentials" otherwise).
- Two-layer lockout: 8 requests / 15 min per IP and 5 failed attempts / 15 min per IP.
- 2-hour session lifetime; sessions revoked on sign-out.

**Transport & headers** (`proxy.ts`)

- Content-Security-Policy (self only for scripts/frames, `frame-ancestors 'none'`, `object-src 'none'`)
- `Strict-Transport-Security` (1 year, preload)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denies camera/microphone/geolocation/payment
- API responses: `Cache-Control: no-store`, `X-Robots-Tag: noindex`
- `/admin`: `X-Robots-Tag: noindex, nofollow`

**Secrets**

- Server-only env vars; no secret is prefixed `NEXT_PUBLIC_`.
- `AUTH_SECRET` / `ADMIN_AUTH_SECRET` fail closed in production (session creation throws if unset).
- `ADMIN_AUTH_SECRET` signs admin sessions; admin passwords live in Supabase Auth, not in env.

## Known limitations / production checklist

- [ ] **Persistent storage** — the default JSON store is per-instance and ephemeral on free hosting. Mount a disk (`DATA_DIR`) or migrate to Postgres/Redis.
- [ ] **Shared rate limiting** — the limiter is in-memory; use Redis for multiple instances.
- [ ] **Admin accounts** — managed in Supabase Auth + `public.users.role`; use `npm run create:admin` to provision. Add per-user audit/roles before adding staff.
- [ ] **No email verification for dev login** — dev login is disabled in production; Google login requires a verified email.
- [ ] **Session revocation on password change** — not applicable for Google login; add a `sessionsValidAfter` field if password login is added.
- [ ] **Set `APP_URL`** in production so OAuth redirect URIs and origin checks are exact.
- [ ] **Set `NEXT_PUBLIC_WHATSAPP_NUMBER`** to the real business number; it is still a placeholder.
- [ ] **Rotate secrets** periodically and after any suspected exposure.
- [ ] **Keep dependencies patched** — run `npm audit` / Dependabot.
- [ ] **WAF/CDN** in front of Render/Railway for volumetric protection.
- [ ] **Back up** `db.json` if you keep using the file store.

## Reporting

Report vulnerabilities privately to **hello@milletjar.in**. Please include reproduction steps and do not open a public issue.
