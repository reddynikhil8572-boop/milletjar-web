#!/usr/bin/env node
/**
 * End-to-end smoke test for the running app.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.SMOKE_BASE || "http://localhost:3012";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

class Jar {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }
  store(res) {
    const list =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const raw of list) {
      const pair = raw.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx < 0) continue;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1);
      if (!value) this.cookies.delete(key);
      else this.cookies.set(key, value);
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function req(jar, path, init = {}) {
  const headers = { ...(init.headers || {}) };
  const cookie = jar ? jar.header() : "";
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });
  if (jar) jar.store(res);
  let body = null;
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    body = await res.json().catch(() => null);
  }
  return { res, body };
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const ready = await waitForServer();
check("server responds on /api/health", ready, BASE);
if (!ready) process.exit(1);

// --- public pages ---
for (const path of ["/", "/products", "/cart", "/login", "/about", "/contact"]) {
  const { res } = await req(null, path);
  check(`GET ${path} renders`, res.status === 200, `status ${res.status}`);
}

for (const [path, target] of [
  ["/account", "/login"],
  ["/booking", "/login"],
  ["/admin", "/admin/login"],
]) {
  const { res } = await req(null, path);
  const location = res.headers.get("location") || "";
  check(
    `GET ${path} redirects anonymous users to ${target}`,
    [303, 307, 308].includes(res.status) && location.includes(target),
    `status ${res.status} location ${location}`
  );
}

// --- security headers ---
{
  const { res } = await req(null, "/");
  check(
    "CSP header present",
    Boolean(res.headers.get("content-security-policy")),
    res.headers.get("content-security-policy") || "missing"
  );
  check(
    "X-Frame-Options DENY",
    res.headers.get("x-frame-options") === "DENY"
  );
  check(
    "API responses are no-store",
    (await req(null, "/api/health")).res.headers
      .get("cache-control")
      ?.includes("no-store") ?? false
  );
}

// --- customer auth ---
const alice = new Jar("alice");
{
  const { res, body } = await req(alice, "/api/auth/dev-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.com", name: "Alice" }),
  });
  check(
    "dev sign-in works",
    res.status === 200 && Boolean(body?.csrfToken),
    `status ${res.status}`
  );
  check(
    "session cookie is httpOnly + sameSite",
    /httponly/i.test(res.headers.getSetCookie().join(";")) &&
      /samesite/i.test(res.headers.getSetCookie().join(";")),
    res.headers.getSetCookie().join(" | ")
  );
}

let csrf = "";
{
  const { res, body } = await req(alice, "/api/auth/me");
  csrf = body?.csrfToken || "";
  check(
    "session resolves to the signed-in user",
    res.status === 200 && body?.user?.email === "alice@example.com",
    JSON.stringify(body)
  );
  check("CSRF token issued", Boolean(csrf));
}

// --- order verification ---
const orderBody = (extra = {}) => ({
  items: [
    { productId: "mj-foxtail", qty: 2, price: 1 },
    { productId: "mj-mix", qty: 1, price: 1 },
  ],
  customer: {
    name: "Alice Kumar",
    phone: "9876543210",
    address: "12, Green Street, Jayanagar",
    pincode: "560041",
    city: "Bengaluru",
    slot: "Morning (9am – 12pm)",
  },
  method: "whatsapp",
  ...extra,
});

{
  const { res } = await req(alice, "/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderBody()),
  });
  check(
    "order without CSRF is rejected (403)",
    res.status === 403,
    `status ${res.status}`
  );
}

{
  const anonymous = new Jar("anon");
  const { res } = await req(anonymous, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(orderBody()),
  });
  check(
    "order without a session is rejected (401)",
    res.status === 401,
    `status ${res.status}`
  );
}

let orderId = "";
let orderTotal = 0;
let reference = "";
{
  const { res, body } = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(orderBody()),
  });
  orderId = body?.order?.id || "";
  orderTotal = body?.order?.total || 0;
  reference = body?.order?.reference || "";
  // 199*2 + 249 = 647 -> free shipping, so 647. Client-sent prices ignored.
  check(
    "order is created with server-side pricing",
    res.status === 201 && orderTotal === 647,
    `status ${res.status} total ${orderTotal}`
  );
  const message = decodeURIComponent(body?.whatsappUrl || "");
  check(
    "WhatsApp message includes customer, items, quantities and total",
    [
      "Name: Alice Kumar",
      "Phone: 9876543210",
      "Address: 12, Green Street, Jayanagar",
      "City: Bengaluru",
      "Pincode: 560041",
      "Delivery Slot: Morning (9am – 12pm)",
      "Rate: ₹199",
      "Qty: 2",
      "Rate: ₹249",
      "Qty: 1",
      "*GRAND TOTAL: ₹647*",
    ].every((part) => message.includes(part)),
    message
  );
  check("order reference generated", /^MJ\d{6}-/.test(reference), reference);
}

{
  const { res, body } = await req(alice, "/api/orders");
  check(
    "customer sees their own orders",
    res.status === 200 && body?.orders?.some((o) => o.id === orderId),
    `status ${res.status}`
  );
}

{
  const bob = new Jar("bob");
  const login = await req(bob, "/api/auth/dev-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bob@example.com", name: "Bob" }),
  });
  const bobCsrf = login.body?.csrfToken || "";
  const { res } = await req(bob, `/api/orders/${orderId}`);
  check(
    "another customer cannot read the order (404)",
    res.status === 404,
    `status ${res.status}`
  );

  const forged = await req(bob, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": bobCsrf,
    },
    body: JSON.stringify(
      orderBody({ items: [{ productId: "does-not-exist", qty: 1 }] })
    ),
  });
  check(
    "unknown products are rejected",
    forged.res.status === 400,
    `status ${forged.res.status}`
  );
}

// --- online payments are fully disabled ---
{
  for (const path of ["/payment", "/api/payment/intent", "/api/payment/webhook"]) {
    const { res } = await req(alice, path);
    check(`${path} is unavailable (404)`, res.status === 404, `status ${res.status}`);
  }

  const online = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({
      items: [{ productId: "mj-foxtail", qty: 1 }],
      customer: {
        name: "Alice",
        phone: "9876543210",
        address: "12 Test Street",
        pincode: "500001",
      },
      method: "online",
    }),
  });
  check(
    "online order method is rejected (400)",
    online.res.status === 400,
    `status ${online.res.status}`
  );
}

// --- admin auth (isolated) ---
const admin = new Jar("admin");
let adminCsrf = "";
{
  const wrong = await req(admin, "/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@milletjar.in",
      password: "wrong-password",
    }),
  });
  check(
    "admin login rejects a wrong password",
    wrong.res.status === 401,
    `status ${wrong.res.status}`
  );

  const { res, body } = await req(admin, "/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@milletjar.in",
      password: "admin12345",
    }),
  });
  adminCsrf = body?.csrfToken || "";
  check(
    "admin login succeeds with correct credentials",
    res.status === 200 && Boolean(adminCsrf),
    `status ${res.status}`
  );
  check(
    "admin cookie is a different cookie name",
    res.headers.getSetCookie().some((c) => c.startsWith("mj_admin_session=")),
    res.headers.getSetCookie().join(" | ")
  );
}

{
  const { res } = await req(admin, "/admin");
  check(
    "admin dashboard renders for an admin session",
    res.status === 200,
    `status ${res.status}`
  );

  const customerTrying = await req(alice, "/api/admin/orders");
  check(
    "customer session cannot use admin APIs (401)",
    customerTrying.res.status === 401,
    `status ${customerTrying.res.status}`
  );

  const customerPage = await req(alice, "/admin");
  check(
    "customer session cannot open the admin page",
    [303, 307, 308].includes(customerPage.res.status),
    `status ${customerPage.res.status}`
  );
}

{
  const { res, body } = await req(admin, "/api/admin/orders");
  check(
    "admin lists all orders",
    res.status === 200 && body?.orders?.length >= 1,
    `status ${res.status}`
  );

  const noCsrf = await req(admin, `/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "confirmed" }),
  });
  check(
    "admin mutation without CSRF is rejected (403)",
    noCsrf.res.status === 403,
    `status ${noCsrf.res.status}`
  );

  const { res: patched, body: patchBody } = await req(
    admin,
    `/api/admin/orders/${orderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ status: "shipped" }),
    }
  );
  check(
    "admin can update order status",
    patched.status === 200 && patchBody?.order?.status === "shipped",
    `status ${patched.status}`
  );

  const patchStatus = (status) =>
    req(admin, `/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ status }),
    });

  const allStates = [
    "pending",
    "confirmed",
    "paid",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const cycle = [];
  for (const status of allStates) {
    const patch = await patchStatus(status);
    const read = await req(admin, `/api/admin/orders/${orderId}`);
    cycle.push(
      patch.res.status === 200 &&
        patch.body?.order?.status === status &&
        read.body?.order?.status === status
    );
  }
  check(
    "admin can cycle every order state and each change persists",
    cycle.every(Boolean),
    allStates.map((s, i) => `${s}:${cycle[i]}`).join(" ")
  );

  const invalid = await patchStatus("not-a-status");
  check(
    "admin rejects an invalid order state (400)",
    invalid.res.status === 400,
    `status ${invalid.res.status}`
  );

  await patchStatus("delivered");
  const filtered = await req(admin, "/api/admin/orders?status=delivered");
  check(
    "admin status filter reflects the current order state",
    filtered.body?.orders?.some((o) => o.id === orderId),
    `status ${filtered.res.status}`
  );

  const customerView = await req(alice, `/api/orders/${orderId}`);
  check(
    "customer order view reflects the admin update",
    customerView.body?.order?.status === "delivered",
    customerView.body?.order?.status
  );

  const paidPatch = await req(admin, `/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": adminCsrf,
    },
    body: JSON.stringify({ paid: true }),
  });
  check(
    "mark paid updates payment and order state",
    paidPatch.body?.order?.payment?.status === "paid" &&
      paidPatch.body?.order?.status === "paid",
    JSON.stringify(paidPatch.body?.order?.payment)
  );

  const customerCsrfAttempt = await req(alice, `/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  check(
    "customer CSRF token cannot mutate admin resources",
    customerCsrfAttempt.res.status === 401,
    `status ${customerCsrfAttempt.res.status}`
  );
}

{
  const { res } = await req(admin, "/api/admin/auth/me", {
    method: "POST",
    headers: { "x-csrf-token": adminCsrf },
  });
  check("admin sign-out works", res.status === 200, `status ${res.status}`);

  const after = await req(admin, "/api/admin/orders");
  check(
    "admin session is invalid after sign-out",
    after.res.status === 401,
    `status ${after.res.status}`
  );
}

// --- customer logout ---
{
  const me = await req(alice, "/api/auth/me");
  const logoutCsrf = me.body?.csrfToken || "";

  const noCsrf = await req(alice, "/api/auth/logout", { method: "POST" });
  check(
    "logout without CSRF is rejected (403)",
    noCsrf.res.status === 403,
    `status ${noCsrf.res.status}`
  );

  const { res } = await req(alice, "/api/auth/logout", {
    method: "POST",
    headers: { "x-csrf-token": logoutCsrf },
  });
  check("customer sign-out works", res.status === 200, `status ${res.status}`);

  const after = await req(new Jar("post-logout"), "/api/auth/me");
  check(
    "signed-out user no longer resolves",
    after.res.status === 200 && after.body?.user === null,
    JSON.stringify(after.body)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
