import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin, jsonError } from "@/lib/guard";
import { readDB, writeDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "paid",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .optional(),
  paid: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(req, {
    key: "admin:orders:update",
    csrf: true,
    limit: 60,
  });
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid update");

  const updated = await writeDB((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return null;
    if (parsed.data.status) order.status = parsed.data.status;
    if (typeof parsed.data.paid === "boolean") {
      order.payment.status = parsed.data.paid ? "paid" : "unpaid";
      if (parsed.data.paid) order.status = "paid";
    }
    order.updatedAt = Date.now();
    db.audit.push({
      id: `aud_${Math.random().toString(36).slice(2, 10)}`,
      actor: "admin",
      actorId: guard.email,
      action: "order.update",
      target: order.id,
      createdAt: Date.now(),
    });
    return order;
  });

  if (!updated) return jsonError(404, "Order not found");
  return NextResponse.json({ ok: true, order: updated }, { status: 200 });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(req, {
    key: "admin:orders:read",
    csrf: false,
    limit: 120,
  });
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const order = await readDB((db) => db.orders.find((o) => o.id === id));
  if (!order) return jsonError(404, "Order not found");
  return NextResponse.json({ order }, { status: 200 });
}
