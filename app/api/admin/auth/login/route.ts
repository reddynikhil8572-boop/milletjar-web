import { NextResponse } from "next/server";
import { z } from "zod";
import { adminConfigured, env } from "@/lib/env";
import { guardPublic, jsonError, tooMany } from "@/lib/guard";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createAdminSession } from "@/lib/admin";
import { safeEqual, verifyPassword } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

/**
 * Admin sign-in. Completely separate from customer auth:
 * different endpoint, cookie, secret, session store and lifetime.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const guard = guardPublic(req, { key: "admin:login", limit: 8, windowMs: 15 * 60_000 });
  if (!guard.ok) return guard.response;

  // Independent lockout so credential stuffing burns out quickly.
  const attempt = rateLimit(`admin:attempt:${ip}`, 5, 15 * 60_000);
  if (!attempt.allowed) return tooMany(attempt.retryAfter);

  if (!adminConfigured()) {
    return jsonError(503, "Admin sign-in is not configured");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid credentials");

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  // Compare email first in constant time, then password.
  const emailMatches = safeEqual(email, env.adminEmail);
  let passwordMatches = false;
  if (emailMatches) {
    passwordMatches = env.adminPasswordHash
      ? await verifyPassword(password, env.adminPasswordHash)
      : !env.isProd && safeEqual(password, env.adminPassword);
  }

  if (!emailMatches || !passwordMatches) {
    // Generic message: never reveal which field was wrong.
    return jsonError(401, "Invalid credentials");
  }

  const csrf = await createAdminSession(email);
  return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 200 });
}
