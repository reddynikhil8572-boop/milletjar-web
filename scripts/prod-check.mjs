#!/usr/bin/env node
/** Production-mode checks: dev backdoors must be off, pages must render. */
const BASE = process.argv[2] || "http://localhost:3012";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@milletjar.in";
let failed = 0;
let passed = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
  }
};

for (let i = 0; i < 60; i += 1) {
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (res.ok) break;
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 1000));
}

const get = (path, init = {}) => {
  const headers = { ...(init.headers || {}) };
  if (
    (init.method || "GET").toUpperCase() !== "GET" &&
    !headers.origin &&
    !headers.Origin
  ) {
    headers.origin = new URL(BASE).origin;
  }
  return fetch(`${BASE}${path}`, { redirect: "manual", ...init, headers });
};

check("health endpoint", (await get("/api/health")).status === 200);

const home = await get("/");
const html = await home.text();
check("home renders", home.status === 200);
check(
  "home contains brand tagline",
  html.includes("Fresh from Farm to Your Family"),
  ""
);
check(
  "no dev sign-in form in production HTML",
  !html.includes("Sign in for testing")
);

const missing = await get("/this-page-does-not-exist");
const missingHtml = await missing.text();
check(
  "custom 404 page renders",
  missing.status === 404 && missingHtml.includes("Page not found"),
  `status ${missing.status}`
);

const robotsRes = await get("/robots.txt");
const robots = await robotsRes.text();
check(
  "robots.txt points to the sitemap",
  robotsRes.status === 200 && robots.includes("Sitemap:") && robots.includes("/sitemap.xml"),
  `status ${robotsRes.status}`
);

const sitemapRes = await get("/sitemap.xml");
const sitemap = await sitemapRes.text();
check(
  "sitemap.xml lists product URLs",
  sitemapRes.status === 200 && sitemap.includes("/products/foxtail-millet"),
  `status ${sitemapRes.status}`
);

for (const [path, target] of [
  ["/account", "/login"],
  ["/booking", "/login"],
  ["/admin", "/admin/login"],
]) {
  const res = await get(path);
  check(
    `${path} redirects to ${target}`,
    [303, 307, 308].includes(res.status) &&
      (res.headers.get("location") || "").includes(target),
    `${res.status} ${res.headers.get("location")}`
  );
}

const devLogin = await get("/api/auth/dev-login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "attacker@example.com" }),
});
check(
  "dev-login is disabled in production (404)",
  devLogin.status === 404,
  `status ${devLogin.status}`
);

const signupDisabled = await get("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "nobody@example.com",
    password: "not-used-123",
  }),
});
check(
  "unverified signup is disabled in production (403)",
  signupDisabled.status === 403,
  `status ${signupDisabled.status}`
);

const noOriginLogin = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: "nobody@example.com", password: "x" }),
  redirect: "manual",
});
check(
  "password login requires a same-origin Origin header (403)",
  noOriginLogin.status === 403,
  `status ${noOriginLogin.status}`
);

const adminLogin = await get("/api/admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password: "definitely-not-the-password",
  }),
});
check(
  "admin login rejects invalid credentials",
  adminLogin.status === 401,
  `status ${adminLogin.status}`
);

const anonOrder = await get("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
check(
  "order creation requires a session (401)",
  anonOrder.status === 401,
  `status ${anonOrder.status}`
);

const h = (await get("/")).headers;
const csp = h.get("content-security-policy") || "";
check("CSP present", Boolean(csp));
check("CSP includes a per-request nonce", csp.includes("'nonce-"), csp);
check("CSP has no unsafe-inline scripts", !csp.includes("'unsafe-inline'"), csp);
check("HSTS present", Boolean(h.get("strict-transport-security")));
check("X-Frame-Options DENY", h.get("x-frame-options") === "DENY");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
