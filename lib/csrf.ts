import { safeEqual, isSameOrigin } from "./crypto";

export type GuardFailure = {
  ok: false;
  status: number;
  error: string;
};

export type GuardSuccess<T> = { ok: true; value: T };

export type GuardResult<T> = GuardSuccess<T> | GuardFailure;

/**
 * CSRF protection for authenticated mutations.
 *
 * The token is returned by the server in a same-origin JSON response
 * (/api/auth/me, /api/admin/auth/me) and must be echoed in the
 * `x-csrf-token` header. A cross-site attacker cannot read that response,
 * so they cannot forge the header even though cookies are sent.
 */
export function assertCsrf(req: Request, expected: string): GuardFailure | null {
  if (!isSameOrigin(req)) {
    return { ok: false, status: 403, error: "Cross-origin request rejected" };
  }
  const provided = req.headers.get("x-csrf-token") || "";
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 403, error: "Invalid CSRF token" };
  }
  return null;
}
