"use client";

import { useCart } from "./cart-provider";

const MAX_QTY = 20;

/**
 * Card buy control: one tap adds a single unit, then the same slot becomes a
 * quantity stepper (− qty +) so the quantity can be adjusted in place.
 * Pressing − at 1 empties the cart line and the control returns to "Buy".
 */
export default function AddToCart({
  productId,
  inStock = true,
  wide = false,
  max,
}: {
  productId: string;
  inStock?: boolean;
  /** Larger control for the product detail page. */
  wide?: boolean;
  /** Highest quantity allowed (tracked stock); defaults to MAX_QTY. */
  max?: number;
}) {
  const { lines, add, setQty } = useCart();
  const qty = lines.find((line) => line.productId === productId)?.qty ?? 0;
  const limit = Math.max(1, Math.min(MAX_QTY, max ?? MAX_QTY));

  const sizing = wide
    ? "px-6 py-3.5 text-base"
    : "px-5 py-2.5 text-sm";

  if (!inStock) {
    return (
      <span
        className={`inline-flex w-full items-center justify-center rounded-full bg-mj-cream font-medium text-mj-brown ${sizing}`}
      >
        Currently unavailable
      </span>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => add(productId, 1)}
        className={`mj-press inline-flex w-full items-center justify-center gap-2 rounded-full bg-mj-green font-medium text-white hover:bg-mj-green-700 ${sizing}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Buy
      </button>
    );
  }

  return (
    <div
      className={`mj-pop inline-flex w-full items-center justify-between rounded-full bg-mj-green text-white ${wide ? "px-2 py-1.5" : "px-1.5 py-1"}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => setQty(productId, qty - 1)}
        className={`flex items-center justify-center rounded-full bg-white/15 font-semibold hover:bg-white/25 ${
          wide ? "h-11 w-11 text-xl" : "h-9 w-9 text-lg"
        }`}
      >
        −
      </button>
      <span
        className={`text-center font-semibold ${
          wide ? "min-w-10 text-lg" : "min-w-8 text-sm"
        }`}
        aria-live="polite"
        title={
          qty >= limit
            ? max !== undefined && max < MAX_QTY
              ? `Only ${max} in stock`
              : `Maximum ${limit} per order`
            : `${qty} in cart`
        }
      >
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={qty >= limit}
        onClick={() => add(productId, 1)}
        className={`flex items-center justify-center rounded-full bg-white/15 font-semibold hover:bg-white/25 disabled:opacity-40 ${
          wide ? "h-11 w-11 text-xl" : "h-9 w-9 text-lg"
        }`}
      >
        +
      </button>
    </div>
  );
}
