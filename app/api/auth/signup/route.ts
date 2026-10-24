import { NextResponse } from "next/server";
import { z } from "zod";
import { guardPublic, jsonError, serverError } from "@/lib/guard";
import { createPasswordUser, createUserSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).optional(),
});

/** Create an email+password account and sign the user in. */
export async function POST(req: Request) {
  const guard = guardPublic(req, { key: "auth:signup", limit: 10, windowMs: 60_000 });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Enter a valid email and a password of at least 8 characters");
  }

  try {
    const user = await createPasswordUser(parsed.data);
    if (!user) {
      return jsonError(409, "An account with this email already exists. Try signing in.");
    }
    const csrf = await createUserSession(user.id);
    return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 201 });
  } catch {
    return serverError("auth:signup");
  }
}
