#!/usr/bin/env node
/**
 * Verifies the Google OAuth wiring without completing a real browser consent.
 * Usage: node scripts/check-google.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3012";

async function main() {
  const me = await fetch(`${BASE}/api/auth/me`, { cache: "no-store" });
  const meBody = await me.json();
  console.log(`googleEnabled: ${meBody.googleEnabled}`);
  if (!meBody.googleEnabled) {
    console.log(
      "FAIL  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not both visible to the server."
    );
    process.exit(1);
  }

  const start = await fetch(`${BASE}/api/auth/google/start?next=/payment`, {
    redirect: "manual",
    cache: "no-store",
  });

  const location = start.headers.get("location") || "";
  const cookies = start.headers.getSetCookie();
  const url = new URL(location);
  const params = url.searchParams;

  const checks = [
    ["start redirects (307)", start.status === 307, `status ${start.status}`],
    ["hosts on accounts.google.com", url.host === "accounts.google.com", url.host],
    ["client_id matches", Boolean(params.get("client_id")), "missing"],
    [
      "redirect_uri is the local callback",
      params.get("redirect_uri") === `${BASE}/api/auth/google/callback`,
      params.get("redirect_uri") || "missing",
    ],
    ["PKCE S256 challenge present", params.get("code_challenge_method") === "S256", params.get("code_challenge_method") || "missing"],
    ["state present", (params.get("state") || "").length >= 20, params.get("state") || "missing"],
    ["scope includes email", (params.get("scope") || "").includes("email"), params.get("scope") || "missing"],
    [
      "state cookie is httpOnly",
      cookies.some(
        (c) => c.startsWith("mj_oauth_state=") && /httponly/i.test(c)
      ),
      cookies.join(" | "),
    ],
  ];

  let failed = 0;
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) {
      failed += 1;
      console.log(`      -> ${detail}`);
    }
  }

  // A callback with a state that does not match the cookie must fail closed.
  const stateCookie = cookies.find((c) => c.startsWith("mj_oauth_state="));
  const callback = await fetch(
    `${BASE}/api/auth/google/callback?code=fake&state=wrong-state`,
    {
      redirect: "manual",
      cache: "no-store",
      headers: stateCookie ? { cookie: stateCookie.split(";")[0] } : {},
    }
  );
  const callbackLocation = callback.headers.get("location") || "";
  const stateRejected =
    [303, 307, 308].includes(callback.status) &&
    callbackLocation.includes("error=oauth_state_mismatch");
  console.log(
    `${stateRejected ? "PASS" : "FAIL"}  callback rejects a mismatched state`
  );
  if (!stateRejected) {
    failed += 1;
    console.log(`      -> ${callback.status} ${callbackLocation}`);
  }

  console.log(`\n${failed === 0 ? "OAuth wiring OK" : `${failed} failure(s)`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("check failed:", error.message);
  process.exit(1);
});
