"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";

export default function AddToCart({
  productId,
  compact = false,
}: {
  productId: string;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(productId, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${
        compact ? "px-4 py-2 text-sm" : "w-full px-5 py-2.5 text-sm"
      } ${
        added
          ? "bg-mj-orange text-white"
          : "bg-mj-green text-white hover:bg-mj-green-700"
      }`}
    >
      {added ? (
        <>
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
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Added
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add to cart
        </>
      )}
    </button>
  );
}
