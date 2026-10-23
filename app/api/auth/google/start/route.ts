import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomToken } from "@/lib/crypto";
import { buildAuthorizeUrl, redirectUri } from "@/lib/google";
import { googleConfigured } from "@/lib/env";
import { guardPublic } from "@/lib/guard";
import { writeDB } from "@/lib/store";
import { requestOrigin } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "mj_oauth_state";

export async function GET(req: Request) {
  const guard = guardPublic(req, { key: "auth:google:start", limit: 20 });
  if (!guard.ok) return guard.response;

  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", req.url)
    );
  }

  const state = randomToken(24);
  const verifier = randomToken(48);
  const origin = requestOrigin(req);

  const requestedNext = new URL(req.url).searchParams.get("next") || "";
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    requestedNext.length <= 300
      ? requestedNext
      : "";

  await writeDB((db) => {
    const now = Date.now();
    db.oauthStates = db.oauthStates.filter((s) => now - s.createdAt < 10 * 60_000);
    db.oauthStates.push({ state, verifier, createdAt: now, next: next || undefined });
  });

  const store = await cookies();
  store.set(OAUTH_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = buildAuthorizeUrl(state, verifier, origin);
  if (!url.includes(`redirect_uri=${encodeURIComponent(redirectUri(origin))}`)) {
    // Defensive: never send users to a malformed authorize URL.
    return NextResponse.redirect(new URL("/login?error=oauth_config", req.url));
  }
  return NextResponse.redirect(url);
}
