# Millet Jar Website

Storefront for **Millet Jar** (www.milletjar.in) — Next.js 16 (App Router), TypeScript, Tailwind CSS v4.

Tagline: _Fresh from Farm to Your Family._

## What is included

**Storefront**

- Home, products, about, contact
- Dedicated pages for **cart**, **login**, **booking (delivery details)**, **account**, and **order confirmation**
- Cart persisted in `localStorage`; the server reprices every order from the product catalog
- WhatsApp is the **only** ordering channel: the pre-filled message contains customer name, phone, address, city, pincode, delivery slot, every item with rate/quantity/line total, and the grand total

**Accounts**

- Password sign-in with **email address or account ID**; Google sign-in is also available (OAuth 2.0 Authorization Code + PKCE, no third-party auth library)
- The account ID is shown on `/account`; password accounts are admin-provisioned in production (self-signup is development-only until email verification exists)
- Server-side sessions in httpOnly cookies (`mj_session`), 7-day sliding expiry
- Account and order pages show live order status (auto-refresh on tab focus and every 15 seconds after an admin update)

**Ordering & payments**

- **No online payment gateways.** Razorpay/RuPay/UPI/card/net-banking scripts, intents and webhooks have been removed.
- The checkout button is **Order via WhatsApp**. It creates the order, opens a WhatsApp chat with the full order details, and links to the order confirmation page.
- Payment and order confirmation are handled directly with the customer on WhatsApp.

**Admin**

- Completely separate auth from customers:
  - endpoint `/api/admin/auth/*`
  - cookie `mj_admin_session` (SameSite=Strict)
  - separate secret (`ADMIN_AUTH_SECRET`)
  - separate session table and CSRF token
  - 2-hour lifetime, IP lockout after repeated failures
- Dashboard at `/admin`: orders, revenue, status updates

## Local setup

Requirements: Node.js 20.9+ (Node 22 recommended).

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

The app runs with webpack (`next dev --webpack`) because Turbopack native bindings are unreliable on this Windows/WSL setup.

To keep the dev server running after its terminal closes (Windows), start it detached:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-detached.ps1 -Port 3000
# logs: .data\dev.out.log / .data\dev.err.log
```

### Minimum `.env.local` for local testing

```env
APP_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999
AUTH_SECRET=<any long random string>
ADMIN_AUTH_SECRET=<another random string>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Then create the admin account (see [Admin](#admin)):

```bash
npm run create:admin -- admin@milletjar.in "a-strong-password"
```

### Google sign-in setup

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Create an **OAuth client ID** → *Web application*
3. Authorized JavaScript origin: `http://localhost:3000` (and your production origin)
4. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Put the client id/secret in `.env.local`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

The redirect URI is always `${APP_URL}/api/auth/google/callback` (or the request origin when `APP_URL` is unset). It must match Google exactly.

### Password sign-in

Use either the email address or the `usr_...` account ID shown on `/account`, together with the account password. Submitting with the same request id after a network interruption returns the original order instead of creating a duplicate. Self-signup is available only in development; in production, ask the administrator to provision a password account.

### Local sign-in without Google credentials

When `NODE_ENV !== "production"`, a development sign-in form appears on `/login`. It calls `/api/auth/dev-login`, which is hard-disabled in production. This is only for local testing.

### Admin

Admin sign-in authenticates against **Supabase Auth**; the user must also have
`role = 'admin'` in `public.users`. Provision or repair the account with:

```bash
npm run create:admin -- admin@milletjar.in "a-strong-password"
```

Omit the password to have one generated and printed once. The script creates
the Supabase Auth user (email confirmed), grants the admin role, and is safe to
re-run to rotate the password.

- `/admin/login` — not linked from the storefront
- `/admin` — dashboard (orders, revenue, status updates)

There is no environment-variable admin password; the credentials live in
Supabase, so rotating them does not require a redeploy.

## Testing

With the dev server running:

```bash
SMOKE_ADMIN_PASSWORD="<current-admin-password>" npm run test:smoke -- http://localhost:3000
```

The smoke suite covers page rendering, the custom 404 fallback, `robots.txt`/`sitemap.xml`, anonymous redirects, session cookies, CSRF and Origin enforcement, email/user-ID password login, server-side repricing, idempotent retries, complete WhatsApp order content, disabled online-payment routes, stock reservation/409 shortfalls, cancellation restock, cross-user order isolation, admin isolation, admin CSRF and the forward-only admin order-state workflow. The admin password is read from `SMOKE_ADMIN_PASSWORD`; it is never stored in the repository.

Production-mode checks (run against `npm run build && npm run start`):

```bash
SMOKE_ADMIN_EMAIL="admin@milletjar.in" npm run test:prod -- http://localhost:3000
```

Confirms the dev sign-in backdoor and unverified signup are disabled, Origin is required on password login, invalid admin credentials are rejected, configuration fails closed, and security headers (including a CSP nonce) are present.

Other checks:

```bash
npm run lint
npm run build
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | Production | Public origin used for OAuth redirect URIs, origin checks and absolute sitemap/robots URLs |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes | WhatsApp number, digits only, e.g. `919876543210` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Contact address shown on `/contact` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | For Search Console | Google's HTML-tag verification token; renders `<meta name="google-site-verification">` |
| `AUTH_SECRET` | Production | Customer session secret (32+ random chars) |
| `ADMIN_AUTH_SECRET` | Production | Admin session secret, must differ from `AUTH_SECRET` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | OAuth web client credentials |
| `SUPABASE_URL` | Admin login + data store | e.g. `https://<project-ref>.supabase.co`; unset = local file store and admin login unavailable |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin login + data store | service_role key from Project Settings → API; run `supabase/schema.sql` first, then `npm run migrate:supabase` |
| `DATA_DIR` | Recommended | Directory for `db.json` (default `.data`) |
| `TRUST_PROXY` | No | Set to `false` only if the app is directly exposed; otherwise the right-most `X-Forwarded-For` entry is used for rate limits |
| `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` | Test only | Current admin credentials used by the smoke/prod scripts; never commit them |

Payment gateway keys are intentionally not read by the app. Do not configure
`PAYMENT_*` variables — they have no effect. `WHATSAPP_ACCESS_TOKEN` and
`WHATSAPP_PHONE_NUMBER_ID` are also unused: ordering uses `wa.me` deep links only.

At startup, production fails closed if `APP_URL`, the real WhatsApp number,
strong distinct session secrets, or Supabase configuration are missing.

Generate secrets with `openssl rand -base64 48`.

## Google Search Console

The app serves `/sitemap.xml` (public pages + live product URLs) and `/robots.txt`
(points crawlers to the sitemap and disallows `/admin`, `/account`, `/booking`,
`/cart`, `/login`, `/order/` and `/api/`). Those private pages also emit
`noindex`.

1. In Search Console, add `https://www.milletjar.in` and choose the **HTML tag**
   verification method. Copy the `content` value from the meta tag Google shows.
2. Set it as `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in the environment, then
   rebuild/redeploy (it is inlined at build time). Do **not** add the quotes or
   the surrounding HTML.
3. Click **Verify** in Search Console. If you prefer the **HTML file** method,
   download the Google-named file (e.g. `google1234567890.html`) and place it in
   `public/` — the exact filename comes from Google, so it cannot be pre-created.
4. Submit `https://www.milletjar.in/sitemap.xml` under **Sitemaps**.

## Data storage

The store has two modes behind one interface (`lib/store.ts`):

- **Supabase (production)** — used automatically when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. All data (users, password hashes, sessions, orders, saved addresses, audit events) lives in Postgres over the HTTPS data API, so it survives redeploys with no volume needed.
- **Local JSON file (development fallback)** — `${DATA_DIR}/db.json` (default `./.data/db.json`) when Supabase is not configured. Admin product photos are stored in `${DATA_DIR}/product-images` and served by the app.

### Supabase setup

1. In the Supabase dashboard open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it. Re-run this after upgrades: it creates all tables/RLS plus the CAS snapshot writer (`mj_apply_snapshot`), the shared rate limiter (`mj_rate_limit`), the version row, and any new columns.
2. In `.env.local` set:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # Project Settings → API
```

3. If you already have local data, copy it over once:

```bash
npm run migrate:supabase
```

The `service_role` key is server-only — never expose it with a `NEXT_PUBLIC_` prefix. RLS is enabled on every table with no policies, so the anon/authenticated keys can read nothing.

**Without Supabase (file mode):** Render/Railway container filesystems are ephemeral. Without a mounted disk, accounts, sessions, orders, and uploaded product photos are lost on redeploy/restart. Mount a persistent volume and set `DATA_DIR` to it.

Sessions, orders and rate-limit counters are shared through Supabase when it is configured, so multiple instances enforce the same limits. Without Supabase the local JSON store and in-memory limiter are per-instance and must not be used with more than one replica.

## Legal pages

`/privacy`, `/terms` and `/refund` exist with linked footer and sitemap entries.
They contain clearly marked placeholders for business names, addresses,
retention periods and contact details. Replace every bracketed value with
verified legal facts before launch; the code cannot invent them.

## Deploy

### Render

`render.yaml` is a Blueprint. Set the `sync: false` variables in the dashboard. If you attach a persistent disk, mount it at `/var/data` and set `DATA_DIR=/var/data`.

Free instances cannot attach disks and also sleep when idle; sessions survive on disk only if a disk is attached.

### Railway

1. New project → Deploy from repo
2. Add the environment variables listed above
3. Add a volume mounted at `/data` and set `DATA_DIR=/data`
4. `railway.json` handles the start command and health check

### Docker

```bash
docker build -t milletjar-web .
docker run -p 3000:3000 --env-file .env.production -v milletjar-data:/app/.data milletjar-web
```

## Security overview

See [SECURITY.md](./SECURITY.md).

Highlights:

- Every protected API verifies the server-side session on every request
- All mutations require a session-bound CSRF token (`x-csrf-token`) and same-origin request
- Prices and totals are recomputed server-side; client prices are ignored
- No payment gateway scripts or webhooks; the CSP does not allow payment domains
- Admin auth is fully isolated from customer auth
- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, no-store on APIs, `noindex` on admin/API

## Notes

- `NEXT_PUBLIC_WHATSAPP_NUMBER` still uses the placeholder `919999999999` locally. Production startup refuses to boot until the real business number is supplied.
- Google login requires real OAuth credentials; the button is shown but returns a clear error until they are set.
- Rotate the current admin credentials and remove any stale `.env` copies before deploying; `npm run build` strips `.env*` from the standalone artifact.
- The `checkout` and `/payment` pages from the previous version were removed in favour of `/cart` → `/booking` → `/order/[id]`, with WhatsApp as the only order channel.
