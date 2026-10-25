// Temporary: end-to-end check of the admin product/announcement APIs using a
// minted session (identical to a successful login). Cleans up after itself.
import fs from "node:fs";
import crypto from "node:crypto";

const BASE = process.env.BASE || "http://localhost:3000";
const TEST_EMAIL = "verify-session@local.test";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

// Mint
const token = crypto.randomBytes(32).toString("base64url");
const csrf = crypto.randomBytes(24).toString("base64url");
const now = Date.now();
const mint = await fetch(`${env.SUPABASE_URL}/rest/v1/admin_sessions`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    id: sha256(token),
    email: TEST_EMAIL,
    csrf,
    createdAt: now,
    expiresAt: now + 2 * 60 * 60 * 1000,
    lastSeenAt: now,
  }),
});
if (mint.status >= 300) {
  console.error("mint failed:", mint.status, await mint.text());
  process.exit(1);
}

const auth = {
  Cookie: `mj_admin_session=${token}`,
  "x-csrf-token": csrf,
  "Content-Type": "application/json",
};

async function call(label, path, init, expect) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}: ${res.status} ${
      typeof body === "string" ? body.slice(0, 120) : JSON.stringify(body).slice(0, 220)
    }`
  );
  return { status: res.status, body };
}

const list = await call(
  "GET products",
  "/api/admin/products",
  { headers: { Cookie: `mj_admin_session=${token}` } },
  200
);

const id = list.body?.products?.[0]?.id;
if (id) {
  await call(
    "PATCH product (no migration yet)",
    `/api/admin/products/${id}`,
    { method: "PATCH", headers: auth, body: JSON.stringify({ price: 123 }) },
    500
  );
}
await call(
  "POST product (no migration yet)",
  "/api/admin/products",
  {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "Test Product",
      slug: "test-product",
      description: "temp",
      price: 100,
      image: "/images/logo.png",
      category: "snack",
    }),
  },
  500
);
await call(
  "PUT announcements (no migration yet)",
  "/api/admin/announcements",
  {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ enabled: true, messages: [{ id: "a1", text: "Hello offer" }] }),
  },
  500
);

// Sign out through the app, then purge anything left behind.
await fetch(`${BASE}/api/admin/auth/me`, {
  method: "POST",
  headers: { Cookie: `mj_admin_session=${token}` },
});
await fetch(`${env.SUPABASE_URL}/rest/v1/admin_sessions?email=eq.${TEST_EMAIL}`, {
  method: "DELETE",
  headers: H,
});
console.log("cleaned up minted session(s)");
