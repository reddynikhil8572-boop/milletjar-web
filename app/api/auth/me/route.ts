import { NextResponse } from "next/server";
import { getAuth } from "@/lib/session";
import { guardPublic } from "@/lib/guard";
import { googleConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the current user plus the CSRF token required for mutations. */
export async function GET(req: Request) {
  const guard = guardPublic(req, { key: "auth:me", limit: 120 });
  if (!guard.ok) return guard.response;

  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { user: null, csrfToken: null, googleEnabled: googleConfigured() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        picture: auth.user.picture || null,
        createdAt: auth.user.createdAt,
      },
      csrfToken: auth.session.csrf,
      googleEnabled: googleConfigured(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
