import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { guardPublic, jsonError } from "@/lib/guard";
import { createUserSession, upsertGoogleUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(80).optional(),
});

/**
 * Development-only sign-in so the app can be exercised without Google
 * credentials. Hard-disabled in production.
 */
export async function POST(req: Request) {
  if (env.isProd) return jsonError(404, "Not found");

  const guard = guardPublic(req, { key: "auth:dev-login", limit: 20 });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid email address");

  const user = await upsertGoogleUser({
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name || parsed.data.email.split("@")[0],
  });
  const csrf = await createUserSession(user.id);

  return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 200 });
}
