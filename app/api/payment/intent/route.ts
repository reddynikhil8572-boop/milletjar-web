import { NextResponse } from "next/server";
import { z } from "zod";
import { guardUser, jsonError, serverError } from "@/lib/guard";
import { paymentConfigured, env } from "@/lib/env";
import { readDB, writeDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ orderId: z.string().min(3).max(64) });

/**
 * Creates a provider payment order.
 *
 * The amount is always taken from the stored order (which was priced from the
 * server catalog), never from the request body.
 */
export async function POST(req: Request) {
  const guard = await guardUser(req, {
    key: "payment:intent",
    csrf: true,
    limit: 20,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid order reference");

  const order = await readDB((db) =>
    db.orders.find((o) => o.id === parsed.data.orderId && o.userId === guard.user.id)
  );
  if (!order) return jsonError(404, "Order not found");
  if (order.payment.status === "paid") {
    return jsonError(409, "This order is already paid");
  }
  if (order.status === "cancelled") {
    return jsonError(409, "This order was cancelled");
  }

  if (!paymentConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        mode: "unconfigured",
        message:
          "Online payment is not configured yet. Send your order on WhatsApp instead.",
      },
      { status: 200 }
    );
  }

  try {
    const auth = Buffer.from(
      `${env.paymentKeyId}:${env.paymentKeySecret}`
    ).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: order.total * 100,
        currency: "INR",
        receipt: order.reference,
        notes: { orderId: order.id, userId: order.userId },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[milletjar] payment provider rejected intent", res.status);
      return jsonError(502, "Payment provider unavailable. Please try WhatsApp.");
    }

    const intent = (await res.json()) as { id?: string; amount?: number };
    if (!intent.id) return jsonError(502, "Invalid provider response");

    await writeDB((db) => {
      const stored = db.orders.find((o) => o.id === order.id);
      if (stored) {
        stored.payment.providerRef = intent.id;
        stored.payment.method = "online";
        stored.updatedAt = Date.now();
      }
    });

    return NextResponse.json(
      {
        ok: true,
        mode: "online",
        keyId: env.paymentKeyId,
        providerOrderId: intent.id,
        amount: order.total * 100,
        currency: "INR",
        orderReference: order.reference,
      },
      { status: 200 }
    );
  } catch {
    return serverError("payment:intent");
  }
}
