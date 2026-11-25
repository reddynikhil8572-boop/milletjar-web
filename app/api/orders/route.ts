import { NextResponse } from "next/server";
import { z } from "zod";
import { randomToken } from "@/lib/crypto";
import { guardUser, jsonError, serverError } from "@/lib/guard";
import { CartError, priceAndReserveCart } from "@/lib/pricing";
import { readDB, writeDB } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        qty: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(30),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^\d{10,15}$/, "Enter a valid phone number"),
    address: z.string().trim().min(5).max(300),
    pincode: z.string().trim().regex(/^\d{4,10}$/, "Enter a valid pincode"),
    city: z.string().trim().max(80).optional(),
    slot: z.string().trim().max(80).optional(),
  }),
  /** Sent by the browser so a network retry cannot create a duplicate order. */
  requestId: z
    .string()
    .trim()
    .min(8)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid request id")
    .optional(),
  // WhatsApp is the only order channel. The field remains for old clients.
  method: z.literal("whatsapp").default("whatsapp"),
});

function reference(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = randomToken(6).replace(/[-_]/g, "").slice(0, 8).toUpperCase();
  return `MJ${stamp}-${suffix}`;
}

export async function POST(req: Request) {
  const guard = await guardUser(req, {
    key: "orders:create",
    csrf: true,
    limit: 20,
    windowMs: 60_000,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Please check the order details and try again");
  }

  try {
    const now = Date.now();
    const requestId = parsed.data.requestId || `srv_${randomToken(12)}`;

    const result = await writeDB((db) => {
      // A retried request returns the original order instead of reserving
      // stock a second time.
      if (parsed.data.requestId) {
        // providerRef also carries the key so idempotency keeps working on a
        // database that has not yet run the requestId column migration.
        const idempotencyKey = `req:${parsed.data.requestId}`;
        const existing = db.orders.find(
          (o) =>
            o.userId === guard.user.id &&
            (o.requestId === parsed.data.requestId ||
              o.payment.providerRef === idempotencyKey)
        );
        if (existing) return { order: existing, idempotent: true };
      }

      // Pricing, stock validation and the decrement happen in this snapshot,
      // so a stale snapshot cannot oversell and a failed write rolls back.
      const priced = priceAndReserveCart(db, parsed.data.items);

      const order: Order = {
        id: `ord_${randomToken(10)}`,
        reference: reference(),
        requestId,
        userId: guard.user.id,
        items: priced.items,
        subtotal: priced.subtotal,
        shipping: priced.shipping,
        total: priced.total,
        customer: parsed.data.customer,
        status: "pending",
        payment: {
          method: "whatsapp",
          status: "unpaid",
          providerRef: `req:${requestId}`,
        },
        createdAt: now,
        updatedAt: now,
      };
      db.orders.push(order);
      db.audit.push({
        id: `aud_${randomToken(8)}`,
        actor: "user",
        actorId: guard.user.id,
        action: "order.create",
        target: order.id,
        createdAt: now,
      });

      // Remember the delivery address so the next booking can offer it.
      const c = parsed.data.customer;
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const key = norm(c.address);
      const existingAddress = db.savedAddresses.find(
        (a) => a.userId === guard.user.id && norm(a.address) === key
      );
      if (existingAddress) {
        existingAddress.name = c.name;
        existingAddress.phone = c.phone;
        existingAddress.city = c.city;
        existingAddress.slot = c.slot;
        existingAddress.createdAt = now;
      } else {
        db.savedAddresses.push({
          id: `adr_${randomToken(8)}`,
          userId: guard.user.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          city: c.city,
          pincode: c.pincode,
          slot: c.slot,
          createdAt: now,
        });
        // Keep only the 6 most recently used addresses per customer.
        const mine = db.savedAddresses
          .filter((a) => a.userId === guard.user.id)
          .sort((a, b) => b.createdAt - a.createdAt);
        if (mine.length > 6) {
          const drop = new Set(mine.slice(6).map((a) => a.id));
          db.savedAddresses = db.savedAddresses.filter((a) => !drop.has(a.id));
        }
      }
      return { order, idempotent: false };
    });

    return NextResponse.json(
      {
        ok: true,
        order: result.order,
        whatsappUrl: whatsappLink(result.order),
        next: `/order/${result.order.id}`,
        idempotent: result.idempotent,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (err) {
    if (err instanceof CartError) {
      return jsonError(409, err.message, { problems: err.problems });
    }
    return serverError("orders:create");
  }
}

export async function GET(req: Request) {
  const guard = await guardUser(req, { key: "orders:list", csrf: false, limit: 60 });
  if (!guard.ok) return guard.response;

  const orders = await readDB((db) =>
    db.orders
      .filter((order) => order.userId === guard.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((order) => ({
        id: order.id,
        reference: order.reference,
        total: order.total,
        status: order.status,
        payment: order.payment,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      }))
  );

  return NextResponse.json({ orders }, { status: 200 });
}
