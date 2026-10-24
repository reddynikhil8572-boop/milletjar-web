import { NextResponse } from "next/server";
import { z } from "zod";
import { randomToken } from "@/lib/crypto";
import { guardUser, jsonError, serverError } from "@/lib/guard";
import { priceCart } from "@/lib/pricing";
import { readDB, writeDB } from "@/lib/store";
import { orderMessage } from "@/lib/whatsapp";
import { env } from "@/lib/env";
import type { Order, PaymentMethod } from "@/lib/types";

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
    name: z.string().min(2).max(80),
    phone: z.string().min(10).max(15),
    address: z.string().min(5).max(300),
    pincode: z.string().min(4).max(10),
    city: z.string().max(80).optional(),
    slot: z.string().max(80).optional(),
  }),
  method: z.enum(["whatsapp", "online", "cod"]).default("whatsapp"),
});

function reference(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `MJ${stamp}-${randomToken(3).replace(/[-_]/g, "").slice(0, 5).toUpperCase()}`;
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

  // Prices always come from the server catalog, never from the client.
  const priced = priceCart(parsed.data.items);
  if (priced.items.length === 0) {
    return jsonError(400, "No valid products selected");
  }

  try {
    const now = Date.now();
    const order: Order = {
      id: `ord_${randomToken(10)}`,
      reference: reference(),
      userId: guard.user.id,
      items: priced.items,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      total: priced.total,
      customer: parsed.data.customer,
      status: "pending",
      payment: {
        method: parsed.data.method as PaymentMethod,
        status: "unpaid",
      },
      createdAt: now,
      updatedAt: now,
    };

    await writeDB((db) => {
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
      const existing = db.savedAddresses.find(
        (a) => a.userId === guard.user.id && norm(a.address) === key
      );
      if (existing) {
        existing.name = c.name;
        existing.phone = c.phone;
        existing.city = c.city;
        existing.slot = c.slot;
        existing.createdAt = now;
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
    });

    const whatsappUrl = `https://wa.me/${env.whatsappNumber}?text=${encodeURIComponent(
      orderMessage(order)
    )}`;

    return NextResponse.json(
      {
        ok: true,
        order,
        whatsappUrl,
        next: parsed.data.method === "online" ? `/payment?order=${order.id}` : `/order/${order.id}`,
      },
      { status: 201 }
    );
  } catch {
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
