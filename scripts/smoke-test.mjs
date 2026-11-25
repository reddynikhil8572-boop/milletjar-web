#!/usr/bin/env node
/**
 * End-to-end smoke test for the running app.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.SMOKE_BASE || "http://localhost:3012";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@milletjar.in";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "";
const PASSWORD_USER_EMAIL = `password-${Date.now()}@example.com`;
const PASSWORD_USER_ID = `SmokeTest!${Date.now()}`;

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
  if (
    (init.method || "GET").toUpperCase() !== "GET" &&
    !headers.origin &&
    !headers.Origin
  ) {
    headers.origin = new URL(BASE).origin;
  }
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
for (const path of [
  "/",
  "/products",
  "/cart",
  "/login",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
]) {
  const { res } = await req(null, path);
  check(`GET ${path} renders`, res.status === 200, `status ${res.status}`);
}

// --- error fallback and search-engine discovery ---
{
  const missing = await req(null, "/this-page-does-not-exist");
  const html = await missing.res.text();
  check(
    "unknown route renders the custom 404 page",
    missing.res.status === 404 && html.includes("Page not found"),
    `status ${missing.res.status}`
  );

  const robotsRes = await fetch(`${BASE}/robots.txt`);
  const robots = await robotsRes.text();
  check(
    "robots.txt is served",
    robotsRes.status === 200 &&
      robots.toLowerCase().includes("user-agent: *"),
    `status ${robotsRes.status}`
  );
  check(
    "robots.txt advertises the sitemap",
    robots.includes("/sitemap.xml"),
    robots.slice(0, 120)
  );
  check(
    "robots.txt blocks private areas",
    ["/admin", "/account", "/booking", "/cart", "/login", "/order/"].every(
      (path) => robots.includes(path)
    ),
    robots.slice(0, 200)
  );

  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  check(
    "sitemap.xml is served",
    sitemapRes.status === 200 && sitemap.includes("<urlset"),
    `status ${sitemapRes.status}`
  );
  check(
    "sitemap lists public and product pages",
    sitemap.includes("/products") &&
      sitemap.includes("/products/foxtail-millet") &&
      sitemap.includes("/about") &&
      sitemap.includes("/contact") &&
      sitemap.includes("/privacy") &&
      sitemap.includes("/terms") &&
      sitemap.includes("/refund"),
    sitemap.slice(0, 200)
  );
  check(
    "sitemap excludes private pages",
    !["/admin", "/account", "/booking", "/cart", "/login", "/order/"].some(
      (path) => sitemap.includes(path)
    ),
    sitemap.slice(0, 200)
  );

  const homeHtml = await (await req(null, "/")).res.text();
  check(
    "footer links to the legal pages",
    ["/privacy", "/terms", "/refund"].every((path) => homeHtml.includes(path)),
    "legal links missing from footer"
  );
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
  const csp = res.headers.get("content-security-policy") || "";
  check("CSP header present", Boolean(csp), csp || "missing");
  check("CSP includes a per-request nonce", csp.includes("'nonce-"), csp);
  check(
    "CSP does not use unsafe-inline scripts or styles",
    !csp.includes("'unsafe-inline'"),
    csp
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

// --- email/user-ID password login ---
{
  const lookup = new Jar("password-lookup");
  const created = await req(lookup, "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: PASSWORD_USER_EMAIL,
      password: PASSWORD_USER_ID,
      name: "Password User",
    }),
  });
  const me = await req(lookup, "/api/auth/me");
  const userId = me.body?.user?.id || "";
  check(
    "password account can be created in development",
    created.res.status === 201 && Boolean(userId),
    `status ${created.res.status}`
  );

  const byEmail = await req(null, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: PASSWORD_USER_EMAIL, password: PASSWORD_USER_ID }),
  });
  check(
    "password login accepts an email address",
    byEmail.res.status === 200 && Boolean(byEmail.body?.csrfToken),
    `status ${byEmail.res.status}`
  );

  const byId = await req(null, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: userId, password: PASSWORD_USER_ID }),
  });
  check(
    "password login accepts a user ID",
    byId.res.status === 200 && Boolean(byId.body?.csrfToken),
    `status ${byId.res.status}`
  );

  const wrong = await req(null, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: userId, password: "not-the-password" }),
  });
  check(
    "password login rejects a wrong password",
    wrong.res.status === 401,
    `status ${wrong.res.status}`
  );
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
  const requestId = `smoke-idem-${Date.now()}`;
  const first = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(orderBody({ requestId })),
  });
  const retry = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(orderBody({ requestId })),
  });
  check(
    "retrying with the same request id returns the original order",
    first.res.status === 201 &&
      retry.res.status === 200 &&
      retry.body?.idempotent === true &&
      retry.body?.order?.id === first.body?.order?.id,
    `status ${first.res.status}/${retry.res.status}`
  );
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
    forged.res.status === 409,
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
check(
  "SMOKE_ADMIN_PASSWORD is configured",
  Boolean(ADMIN_PASSWORD),
  "set SMOKE_ADMIN_PASSWORD to the current admin password"
);
const admin = new Jar("admin");
let adminCsrf = "";
{
  const wrong = await req(admin, "/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
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
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
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

// --- server-side stock reservation and shortfall handling ---
let stockOrderId = "";
{
  const patchProduct = (stock) =>
    req(admin, "/api/admin/products/mj-foxtail", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ stock }),
    });
  const readProduct = async () => {
    const { body } = await req(admin, "/api/admin/products");
    return body?.products?.find((p) => p.id === "mj-foxtail");
  };

  const setStock = await patchProduct(1);
  check(
    "admin can set a tracked stock quantity",
    setStock.res.status === 200 && setStock.body?.product?.stock === 1,
    `status ${setStock.res.status}`
  );

  const short = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(
      orderBody({
        items: [{ productId: "mj-foxtail", qty: 2 }],
        requestId: `smoke-short-${Date.now()}`,
      })
    ),
  });
  check(
    "stock shortfall is rejected with 409",
    short.res.status === 409,
    `status ${short.res.status}`
  );

  const reserved = await req(alice, "/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(
      orderBody({
        items: [{ productId: "mj-foxtail", qty: 1 }],
        requestId: `smoke-reserve-${Date.now()}`,
      })
    ),
  });
  stockOrderId = reserved.body?.order?.id || "";
  const afterReserve = await readProduct();
  check(
    "a successful order decrements tracked stock atomically",
    reserved.res.status === 201 && afterReserve?.stock === 0,
    `status ${reserved.res.status} stock ${afterReserve?.stock}`
  );

  const cancelledStockOrder = await req(
    admin,
    `/api/admin/orders/${stockOrderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ status: "cancelled" }),
    }
  );
  const afterCancel = await readProduct();
  check(
    "cancelling an order restocks reserved units",
    cancelledStockOrder.res.status === 200 &&
      cancelledStockOrder.body?.order?.status === "cancelled" &&
      afterCancel?.stock === 1,
    `status ${cancelledStockOrder.res.status} stock ${afterCancel?.stock}`
  );

  await patchProduct(null);
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

  const patchStatus = (status) =>
    req(admin, `/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ status }),
    });

  const firstUpdate = await patchStatus("confirmed");
  check(
    "admin can update order status",
    firstUpdate.res.status === 200 &&
      firstUpdate.body?.order?.status === "confirmed",
    `status ${firstUpdate.res.status}`
  );

  // The order starts at "pending"; only forward transitions are allowed.
  const forwardStates = ["paid", "packed", "shipped", "delivered"];
  const cycle = [];
  for (const status of forwardStates) {
    const patch = await patchStatus(status);
    const read = await req(admin, `/api/admin/orders/${orderId}`);
    cycle.push(
      patch.res.status === 200 &&
        patch.body?.order?.status === status &&
        read.body?.order?.status === status
    );
  }
  check(
    "admin can advance every order state and each change persists",
    cycle.every(Boolean),
    forwardStates.map((s, i) => `${s}:${cycle[i]}`).join(" ")
  );

  const invalid = await patchStatus("not-a-status");
  check(
    "admin rejects an invalid order state (400)",
    invalid.res.status === 400,
    `status ${invalid.res.status}`
  );

  const backward = await patchStatus("pending");
  check(
    "admin rejects a backward order state (409)",
    backward.res.status === 409,
    `status ${backward.res.status}`
  );

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
    "mark paid updates payment without rewinding the order",
    paidPatch.body?.order?.payment?.status === "paid" &&
      paidPatch.body?.order?.status === "delivered",
    JSON.stringify(paidPatch.body?.order)
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

  const deliveredTerminal = await patchStatus("cancelled");
  check(
    "delivered orders are terminal (409)",
    deliveredTerminal.res.status === 409,
    `status ${deliveredTerminal.res.status}`
  );

  const cancelledTerminal = await req(
    admin,
    `/api/admin/orders/${stockOrderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": adminCsrf,
      },
      body: JSON.stringify({ status: "confirmed" }),
    }
  );
  check(
    "cancelled orders are terminal (409)",
    cancelledTerminal.res.status === 409,
    `status ${cancelledTerminal.res.status}`
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
