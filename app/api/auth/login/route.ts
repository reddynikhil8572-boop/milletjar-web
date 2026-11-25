import { NextResponse } from "next/server";
import { z } from "zod";
import { guardPublic, jsonError, serverError } from "@/lib/guard";
import { createUserSession, loginWithPassword } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    identifier: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(200).optional(),
    userId: z.string().trim().min(1).max(64).optional(),
    password: z.string().min(1).max(200),
  })
  .refine(
    (data) => Boolean(data.identifier || data.email || data.userId),
    "An email address or user ID is required"
  );

/**
 * Verify email-or-user-ID + password and start a session. Never reveals which
 * factor failed.
 */
export async function POST(req: Request) {
  const guard = await guardPublic(req, {
    key: "auth:login",
    limit: 10,
    windowMs: 60_000,
    requireOrigin: true,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid email/ID or password");

  try {
    const user = await loginWithPassword({ ...parsed.data });
    if (!user) return jsonError(401, "Invalid email/ID or password");
    const csrf = await createUserSession(user.id);
    return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 200 });
  } catch {
    return serverError("auth:login");
  }
}
