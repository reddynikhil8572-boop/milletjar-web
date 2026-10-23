import { NextResponse } from "next/server";
import { getAdmin, destroyAdminSession } from "@/lib/admin";
import { guardAdmin, guardPublic } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = guardPublic(req, { key: "admin:me", limit: 120 });
  if (!guard.ok) return guard.response;

  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json(
      { admin: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { admin: { email: admin.email, expiresAt: admin.expiresAt }, csrfToken: admin.csrf },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:logout",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;
  await destroyAdminSession();
  return NextResponse.json({ ok: true }, { status: 200 });
}
