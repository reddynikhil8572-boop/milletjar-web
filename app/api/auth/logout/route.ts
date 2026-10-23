import { NextResponse } from "next/server";
import { guardUser, jsonError } from "@/lib/guard";
import { destroyUserSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await guardUser(req, {
    key: "auth:logout",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) {
    // Already signed out is not an error from the client's perspective.
    if (guard.response.status === 401) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return guard.response;
  }

  try {
    await destroyUserSession();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return jsonError(500, "Could not sign out");
  }
}
