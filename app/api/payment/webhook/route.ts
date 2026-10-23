import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { guardPublic, jsonError } from "@/lib/guard";
import { writeDB } from "@/lib/store";
import { safeEqual } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    order?: { entity?: { id?: string; notes?: Record<string, string> } };
  };
};

function verifySignature(raw: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");
  return safeEqual(expected, signature);
}

export async function POST(req: Request) {
  const guard = guardPublic(req, {
    key: "payment:webhook",
    limit: 240,
    windowMs: 60_000,
  });
  if (!guard.ok) return guard.response;

  if (!env.paymentWebhookSecret) {
    return jsonError(503, "Webhook not configured");
  }

  const raw = await req.text();
  const signature =
    req.headers.get("x-razorpay-signature") ||
    req.headers.get("x-webhook-signature") ||
    "";

  if (!signature || !verifySignature(raw, signature, env.paymentWebhookSecret)) {
    return jsonError(401, "Invalid signature");
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return jsonError(400, "Invalid payload");
  }

  const event = payload.event || "";
  // Only successful payment events move an order forward.
  if (event !== "payment.captured" && event !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
  }

  const entity = payload.payload?.payment?.entity;
  const providerRef =
    entity?.order_id ||
    payload.payload?.order?.entity?.id ||
    "";
  const internalId =
    entity?.notes?.orderId || payload.payload?.order?.entity?.notes?.orderId || "";

  if (!providerRef && !internalId) {
    return jsonError(400, "Missing order reference");
  }

  const result = await writeDB((db) => {
    const order = db.orders.find(
      (o) => o.id === internalId || o.payment.providerRef === providerRef
    );
    if (!order) return { matched: false };

    // Idempotency: repeated webhook deliveries must not double-process.
    if (order.payment.status === "paid") {
      return { matched: true, alreadyPaid: true };
    }

    order.payment.status = "paid";
    order.payment.method = "online";
    if (providerRef) order.payment.providerRef = providerRef;
    order.status = "paid";
    order.updatedAt = Date.now();
    db.audit.push({
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      actor: "system",
      actorId: "payment-webhook",
      action: "payment.captured",
      target: order.id,
      createdAt: Date.now(),
    });
    return { matched: true, alreadyPaid: false };
  });

  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}
