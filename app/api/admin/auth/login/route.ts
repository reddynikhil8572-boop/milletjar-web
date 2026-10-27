import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env, supabaseConfigured } from "@/lib/env";
import { guardPublic, jsonError, tooMany } from "@/lib/guard";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createAdminSession } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

/**
 * Admin sign-in via Supabase Auth.
 * Uses credentials from Supabase Authentication (auth.users).
 * Authorization: user must exist in public.users with role 'admin'.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const guard = guardPublic(req, { key: "admin:login", limit: 8, windowMs: 15 * 60_000 });
  if (!guard.ok) return guard.response;

  // Independent lockout so credential stuffing burns out quickly.
  const attempt = rateLimit(`admin:attempt:${ip}`, 5, 15 * 60_000);
  if (!attempt.allowed) return tooMany(attempt.retryAfter);

  if (!supabaseConfigured()) {
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

  try {
    // Verify the password on a short-lived client: a successful sign-in stores
    // a session on the client it was made with, and supabase-js would then send
    // that user's JWT instead of the service-role key on every later query.
    const authClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return jsonError(401, "Invalid credentials");
    }

    const supabase = supabaseAdmin();

    // Check if user is authorized as admin in our users table
    const { data: existingUser, error: userLookupError } = await supabase
      .from("users")
      .select("role, email")
      .eq("email", email)
      .maybeSingle();

    if (userLookupError) {
      console.error("[admin/login] failed to verify admin authorization:", userLookupError);
      return jsonError(500, "Internal server error");
    }
    if (
      !existingUser ||
      existingUser.role !== "admin" ||
      existingUser.email.toLowerCase() !== email
    ) {
      return jsonError(401, "Invalid credentials");
    }

    const csrf = await createAdminSession(email);
    return NextResponse.json({ ok: true, csrfToken: csrf }, { status: 200 });
  } catch (err) {
    console.error("[admin/login] error:", err);
    return jsonError(500, "Internal server error");
  }
}
