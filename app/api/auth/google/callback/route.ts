import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, fetchProfile } from "@/lib/google";
import { googleConfigured } from "@/lib/env";
import { guardPublic, serverError } from "@/lib/guard";
import { readDB, writeDB } from "@/lib/store";
import { createUserSession, upsertGoogleUser } from "@/lib/session";
import { requestOrigin } from "@/lib/url";
import { safeEqual } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "mj_oauth_state";

function backTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export async function GET(req: Request) {
  const guard = guardPublic(req, { key: "auth:google:callback", limit: 30 });
  if (!guard.ok) return guard.response;

  if (!googleConfigured()) {
    return backTo(req, "/login?error=google_not_configured");
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return backTo(req, "/login?error=access_denied");

  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (!code || !state) return backTo(req, "/login?error=oauth_invalid");

  // Bind the callback to the browser that started the flow.
  const store = await cookies();
  const cookieState = store.get(OAUTH_COOKIE)?.value || "";
  if (!cookieState || !safeEqual(cookieState, state)) {
    return backTo(req, "/login?error=oauth_state_mismatch");
  }
  store.delete(OAUTH_COOKIE);

  const pending = await readDB((db) => {
    const record = db.oauthStates.find((s) => s.state === state);
    return record ? { ...record } : null;
  });
  if (!pending) return backTo(req, "/login?error=oauth_expired");
  await writeDB((db) => {
    db.oauthStates = db.oauthStates.filter((s) => s.state !== state);
  });
  if (Date.now() - pending.createdAt > 10 * 60_000) {
    return backTo(req, "/login?error=oauth_expired");
  }

  try {
    const origin = requestOrigin(req);
    const accessToken = await exchangeCode(code, pending.verifier, origin);
    if (!accessToken) return backTo(req, "/login?error=oauth_exchange");

    const profile = await fetchProfile(accessToken);
    if (!profile) return backTo(req, "/login?error=oauth_profile");
    if (!profile.emailVerified) {
      return backTo(req, "/login?error=email_unverified");
    }

    const user = await upsertGoogleUser({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
    await createUserSession(user.id);

    const next = url.searchParams.get("next") || pending.next || "";
    const safeNext = next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/account";
    return backTo(req, safeNext);
  } catch (err) {
    console.error("[milletjar] google callback failed", err);
    return serverError("google callback");
  }
}
