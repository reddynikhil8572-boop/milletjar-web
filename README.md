# Millet Jar Website

Storefront for **Millet Jar** (www.milletjar.in) — Next.js 16 (App Router), TypeScript, Tailwind CSS v4.

Tagline: _Fresh from Farm to Your Family._

## What is included

**Storefront**

- Home, products, about, contact
- Dedicated pages for **cart**, **login**, **booking (delivery details)**, **payment**, **account**, and **order confirmation**
- Cart persisted in `localStorage`; the server reprices every order from the product catalog
- WhatsApp ordering with a pre-filled message containing product name, rate, quantity, line total and grand total

**Accounts**

- Google sign-in (OAuth 2.0 Authorization Code + PKCE, no third-party auth library)
- Server-side sessions in httpOnly cookies (`mj_session`), 7-day sliding expiry
- Account page with order history and payment status

**Payments**

- Optional Razorpay online payments (server-created payment intents, amount taken from the stored order)
- HMAC-verified, idempotent webhook that marks orders paid
- WhatsApp confirmation remains available if payments are not configured

**Admin**

- Completely separate auth from customers:
  - endpoint `/api/admin/auth/*`
  - cookie `mj_admin_session` (SameSite=Strict)
  - separate secret (`ADMIN_AUTH_SECRET`)
  - separate session table and CSRF token
  - 2-hour lifetime, IP lockout after repeated failures
- Dashboard at `/admin`: orders, revenue, status updates, mark-as-paid

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
ADMIN_EMAIL=admin@milletjar.in
ADMIN_PASSWORD=admin12345          # development only
ADMIN_AUTH_SECRET=<another random string>
```

With `ADMIN_PASSWORD` (no hash) admin login works **only** when `NODE_ENV !== "production"`.
For production generate a hash:

```bash
npm run hash:password -- "your-strong-password"
# -> scrypt$<salt>$<key>   (put this in ADMIN_PASSWORD_HASH)
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

### Local sign-in without Google credentials

When `NODE_ENV !== "production"`, a development sign-in form appears on `/login`. It calls `/api/auth/dev-login`, which is hard-disabled in production. This is only for local testing.

### Admin

- `/admin/login` — not linked from the storefront
- `/admin` — dashboard (orders, revenue, status updates)
- Default dev credentials from `.env.local`: `admin@milletjar.in` / `admin12345`

## Testing

With the dev server running:

```bash
npm run test:smoke -- http://localhost:3000
```

46 checks covering page rendering, anonymous redirects, session cookies, CSRF enforcement, server-side repricing, cross-user order isolation, payment webhook signatures/idempotency, admin isolation and admin CSRF.

Production-mode checks (run against `npm run build && npm run start`):

```bash
npm run test:prod -- http://localhost:3000
```

Confirms the dev sign-in backdoor is disabled, plaintext admin passwords are rejected and the security headers are present.

Other checks:

```bash
npm run lint
npm run build
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | Production | Public origin used for OAuth redirect URIs and origin checks |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes | WhatsApp number, digits only, e.g. `919876543210` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Contact address shown on `/contact` |
| `AUTH_SECRET` | Production | Customer session secret (32+ random chars) |
| `ADMIN_AUTH_SECRET` | Production | Admin session secret, must differ from `AUTH_SECRET` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | OAuth web client credentials |
| `ADMIN_EMAIL` | For admin | Admin account email |
| `ADMIN_PASSWORD_HASH` | Production admin | scrypt hash from `npm run hash:password` |
| `ADMIN_PASSWORD` | Dev only | Plain admin password, ignored when `NODE_ENV=production` |
| `PAYMENT_PROVIDER` | No | Defaults to `razorpay` |
| `PAYMENT_KEY_ID` / `PAYMENT_KEY_SECRET` | For online pay | Razorpay API keys |
| `PAYMENT_WEBHOOK_SECRET` | For online pay | Razorpay webhook signing secret |
| `DATA_DIR` | Recommended | Directory for `db.json` (default `.data`) |

Generate secrets with `openssl rand -base64 48`.

## Data storage

Users, sessions, orders and audit events are stored in a JSON file at `${DATA_DIR}/db.json` (default `./.data/db.json`). This keeps deployment dependency-free.

**Important:** Render/Railway container filesystems are ephemeral. Without a mounted disk, accounts, sessions and orders are lost on redeploy/restart. Mount a persistent volume and set `DATA_DIR` to it. The store layer (`lib/store.ts`) is intentionally small so it can be replaced with Postgres/Redis.

For multiple instances you must also move rate limiting and sessions to shared storage (e.g. Redis); the in-memory limiter is per instance.

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
- Webhook payloads verified with HMAC-SHA256 and processed idempotently
- Admin auth is fully isolated from customer auth
- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, no-store on APIs, `noindex` on admin/API

## Notes

- `NEXT_PUBLIC_WHATSAPP_NUMBER` still uses the placeholder `919999999999` until the real business number is supplied.
- Google login requires real OAuth credentials; the button is shown but returns a clear error until they are set.
- The `checkout` page from the previous version was removed in favour of `/cart` → `/booking` → `/payment`.
