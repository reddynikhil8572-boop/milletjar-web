#!/usr/bin/env node
/** Production-mode checks: dev backdoors must be off, pages must render. */
const BASE = process.argv[2] || "http://localhost:3012";
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

const get = (path, init = {}) =>
  fetch(`${BASE}${path}`, { redirect: "manual", ...init });

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

for (const [path, target] of [
  ["/account", "/login"],
  ["/booking", "/login"],
  ["/payment", "/login"],
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

const adminLogin = await get("/api/admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@milletjar.in",
    password: "admin12345",
  }),
});
check(
  "plaintext ADMIN_PASSWORD is rejected in production",
  adminLogin.status === 503 || adminLogin.status === 401,
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
check("CSP present", Boolean(h.get("content-security-policy")));
check("HSTS present", Boolean(h.get("strict-transport-security")));
check("X-Frame-Options DENY", h.get("x-frame-options") === "DENY");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
