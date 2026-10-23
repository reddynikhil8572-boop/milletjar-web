import { NextResponse } from "next/server";
import { guardUser, jsonError } from "@/lib/guard";
import { readDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await guardUser(req, { key: "orders:read", csrf: false, limit: 120 });
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const order = await readDB((db) =>
    db.orders.find((o) => o.id === id && o.userId === guard.user.id)
  );

  // Same response whether the order is missing or owned by someone else,
  // so ids cannot be probed.
  if (!order) return jsonError(404, "Order not found");

  return NextResponse.json({ order }, { status: 200 });
}
