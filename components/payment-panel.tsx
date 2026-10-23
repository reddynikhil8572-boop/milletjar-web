"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate } from "@/lib/api-client";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: () => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type IntentResponse =
  | {
      mode: "online";
      keyId: string;
      providerOrderId: string;
      amount: number;
      currency: string;
      orderReference: string;
    }
  | { mode: "unconfigured"; message: string };

function loadCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-mj-payments="1"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.mjPayments = "1";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPanel({
  order,
  whatsappUrl,
  onlineConfigured,
}: {
  order: {
    id: string;
    reference: string;
    total: number;
    paymentStatus: string;
    customerName: string;
    customerPhone: string;
    items: { name: string; qty: number; lineTotal: number }[];
  };
  whatsappUrl: string;
  onlineConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function payOnline() {
    setBusy(true);
    setError("");

    if (!onlineConfigured) {
      setError(
        "Online payment is not configured yet. Use the WhatsApp button to place this order."
      );
      setBusy(false);
      return;
    }

    const scriptReady = await loadCheckoutScript();
    if (!scriptReady) {
      setError("Could not load the payment window. Please try WhatsApp.");
      setBusy(false);
      return;
    }

    const result = await mutate<IntentResponse>("/api/payment/intent", {
      orderId: order.id,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    if (result.data.mode === "unconfigured") {
      setError(result.data.message);
      setBusy(false);
      return;
    }

    const intent = result.data;
    if (!window.Razorpay) {
      setError("Payment window unavailable. Please try WhatsApp.");
      setBusy(false);
      return;
    }

    const checkout = new window.Razorpay({
      key: intent.keyId,
      amount: intent.amount,
      currency: intent.currency,
      name: "Millet Jar",
      description: `Order ${intent.orderReference}`,
      order_id: intent.providerOrderId,
      prefill: { name: order.customerName, contact: order.customerPhone },
      theme: { color: "#1F7C3F" },
      handler: () => {
        router.push(`/order/${order.id}?paid=1`);
        router.refresh();
      },
      modal: {
        ondismiss: () => setBusy(false),
      },
    });
    checkout.open();
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-2xl border border-mj-beige bg-white p-5 sm:p-6">
        <h2 className="text-lg font-medium text-mj-ink">Order details</h2>
        <p className="mt-0.5 text-sm text-mj-brown">
          Reference <span className="font-medium text-mj-ink">{order.reference}</span>
        </p>

        <ul className="mt-5 space-y-2 text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
              <span className="text-mj-brown">
                {item.name} × {item.qty}
              </span>
              <span className="text-mj-ink">₹{item.lineTotal}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-mj-beige pt-3 text-base font-semibold text-mj-ink">
          <span>Amount payable</span>
          <span className="text-mj-green">₹{order.total}</span>
        </div>

        <Link
          href="/account"
          className="mt-5 inline-block text-xs text-mj-brown hover:text-mj-green"
        >
          View all orders
        </Link>
      </div>

      <div className="rounded-2xl border border-mj-beige bg-white p-5 sm:p-6">
        <h2 className="text-lg font-medium text-mj-ink">Choose how to pay</h2>
        <p className="mt-0.5 text-sm text-mj-brown">
          Both options confirm the same order.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={payOnline}
          disabled={busy || order.paymentStatus === "paid"}
          className="mt-5 w-full rounded-full bg-mj-green px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-mj-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {order.paymentStatus === "paid"
            ? "Already paid"
            : busy
              ? "Opening secure checkout…"
              : "Pay online securely"}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full rounded-full border border-mj-green px-5 py-3 text-center text-sm font-medium text-mj-green transition-colors hover:bg-mj-cream"
        >
          Confirm order on WhatsApp
        </a>

        <div className="mt-5 space-y-1.5 text-xs leading-relaxed text-mj-brown">
          <p>• Payments are processed by the payment provider, not by us.</p>
          <p>• We never see or store your card or UPI details.</p>
          <p>• The amount is verified on our server before payment starts.</p>
        </div>
      </div>
    </div>
  );
}
