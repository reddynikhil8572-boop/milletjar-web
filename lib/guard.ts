import { NextResponse } from "next/server";
import { requireUser } from "./session";
import { getAdmin } from "./admin";
import { assertCsrf } from "./csrf";
import { clientIp, rateLimit } from "./ratelimit";
import type { User, UserSession } from "./types";

export function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

export function tooMany(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

type RouteOpts = {
  /** Require the x-csrf-token header to match the session token. */
  csrf?: boolean;
  /** Requests allowed per window for this key. */
  limit?: number;
  windowMs?: number;
  /** Namespace so limits are per-endpoint. */
  key: string;
};

/**
 * Verifies the caller on every request: valid server-side session, live
 * expiry, rate limit, and (for mutations) a session-bound CSRF token.
 */
export async function guardUser(
  req: Request,
  opts: RouteOpts
): Promise<
  | { ok: true; user: User; session: UserSession; csrf: string }
  | { ok: false; response: NextResponse }
> {
  const limit = rateLimit(
    `${opts.key}:${clientIp(req)}`,
    opts.limit ?? 60,
    opts.windowMs ?? 60_000
  );
  if (!limit.allowed) return { ok: false, response: tooMany(limit.retryAfter) };

  const auth = await requireUser();
  if (!auth) {
    return { ok: false, response: jsonError(401, "Please sign in to continue") };
  }

  if (opts.csrf) {
    const failure = assertCsrf(req, auth.session.csrf);
    if (failure) {
      return { ok: false, response: jsonError(failure.status, failure.error) };
    }
  }

  return {
    ok: true,
    user: auth.user,
    session: auth.session,
    csrf: auth.session.csrf,
  };
}

/** Same checks, but against the isolated admin session. */
export async function guardAdmin(
  req: Request,
  opts: RouteOpts
): Promise<
  | { ok: true; email: string; csrf: string }
  | { ok: false; response: NextResponse }
> {
  const limit = rateLimit(
    `${opts.key}:${clientIp(req)}`,
    opts.limit ?? 60,
    opts.windowMs ?? 60_000
  );
  if (!limit.allowed) return { ok: false, response: tooMany(limit.retryAfter) };

  const admin = await getAdmin();
  if (!admin) {
    return { ok: false, response: jsonError(401, "Admin authentication required") };
  }

  if (opts.csrf) {
    const failure = assertCsrf(req, admin.csrf);
    if (failure) {
      return { ok: false, response: jsonError(failure.status, failure.error) };
    }
  }

  return { ok: true, email: admin.email, csrf: admin.csrf };
}

/**
 * For unauthenticated endpoints (login, OAuth start, webhooks) where CSRF
 * tokens do not exist yet. Still rate limited per IP.
 */
export function guardPublic(
  req: Request,
  opts: RouteOpts
): { ok: true } | { ok: false; response: NextResponse } {
  const limit = rateLimit(
    `${opts.key}:${clientIp(req)}`,
    opts.limit ?? 30,
    opts.windowMs ?? 60_000
  );
  if (!limit.allowed) return { ok: false, response: tooMany(limit.retryAfter) };
  return { ok: true };
}

/** Consistent, non-leaking error responses. */
export function serverError(context: string): NextResponse {
  console.error(`[milletjar] ${context}`);
  return jsonError(500, "Something went wrong. Please try again.");
}
