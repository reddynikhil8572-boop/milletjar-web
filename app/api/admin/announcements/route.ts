import { NextResponse } from "next/server";
import { getAnnouncements, saveAnnouncements } from "@/lib/announcements";
import { guardAdmin, jsonError } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:announcements:read",
    csrf: false,
    limit: 120,
  });
  if (!guard.ok) return guard.response;

  const announcements = await getAnnouncements();
  return NextResponse.json({ announcements }, { status: 200 });
}

export async function PUT(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:announcements:update",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  try {
    const announcements = await saveAnnouncements(body, guard.email);
    return NextResponse.json({ ok: true, announcements }, { status: 200 });
  } catch {
    return jsonError(
      500,
      "Could not save. Run supabase/schema.sql in the Supabase SQL Editor, then retry."
    );
  }
}
