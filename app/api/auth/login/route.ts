import { NextResponse } from "next/server";
import { z } from "zod";
import { guardPublic, jsonError, serverError } from "@/lib/guard";
import { createUserSession, loginWithPassword } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

/** Verify email+password and start a session. Never reveals which failed. */
export async function POST(req: Request) {
  const guard = guardPublic(req, { key: "auth:login", limit: 10, windowMs: 60_000 });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid email or password");

  try {
    const user = await loginWithPassword(parsed.data);
    if (!user) return jsonError(401, "Invalid email or password");
    const csrf = await createUserSession(user.id);
    return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 200 });
  } catch {
    return serverError("auth:login");
  }
}
