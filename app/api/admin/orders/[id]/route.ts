import { NextResponse } from "next/server";
import { z } from "zod";
import { randomToken } from "@/lib/crypto";
import { guardAdmin, jsonError, serverError } from "@/lib/guard";
import { ORDER_STATUSES, canTransition } from "@/lib/order-state";
import { readDB, writeDB } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    paid: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.paid !== undefined, {
    message: "No update supplied",
  });

class UpdateError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "OrderUpdateError";
  }
}

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

  let updated;
  try {
    updated = await writeDB((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw new UpdateError(404, "Order not found");

      const current = order.status as OrderStatus;
      const target = parsed.data.status;
      const now = Date.now();

      if (current === "cancelled") {
        throw new UpdateError(409, "Cancelled orders cannot be changed");
      }
      if (target && !canTransition(current, target)) {
        throw new UpdateError(409, `Cannot change ${current} to ${target}`);
      }
      // Cancelling releases reserved stock exactly once (cancel is terminal).
      if (target === "cancelled") {
        for (const item of order.items) {
          const product = db.products.find((p) => p.id === item.productId);
          if (
            product &&
            product.stock !== null &&
            product.stock !== undefined
          ) {
            product.stock += item.qty;
            product.inStock = true;
            product.updatedAt = now;
          }
        }
      }

      if (target) {
        order.status = target;
        if (target === "paid") order.payment.status = "paid";
      }
      if (parsed.data.paid === true) {
        if (order.payment.status !== "paid") {
          order.payment.status = "paid";
          // Marking payment never rewinds an order that is already packed,
          // shipped or delivered.
          if (current === "pending" || current === "confirmed") {
            order.status = "paid";
          }
        }
      } else if (parsed.data.paid === false) {
        order.payment.status = "unpaid";
      }

      order.updatedAt = now;
      db.audit.push({
        id: `aud_${randomToken(8)}`,
        actor: "admin",
        actorId: guard.email,
        action: target === "cancelled" ? "order.cancel" : "order.update",
        target: order.id,
        createdAt: now,
      });
      return order;
    });
  } catch (err) {
    if (err instanceof UpdateError) return jsonError(err.status, err.message);
    return serverError("admin:orders:update");
  }

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
