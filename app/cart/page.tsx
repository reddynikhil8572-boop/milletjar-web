"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();

  if (!cart.ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-mj-beige" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-mj-cream"
            />
          ))}
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mj-cream text-mj-green">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-mj-ink">
          Your cart is empty
        </h1>
        <p className="mt-2 text-mj-brown">
          Add a few millets and they will show up here.
        </p>
        <Link
          href="/products"
          className="mj-press mt-6 inline-block rounded-full bg-mj-green px-6 py-3 text-sm font-medium text-white hover:bg-mj-green-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-mj-ink">Your cart</h1>
      <p className="mt-1 text-mj-brown">
        {cart.count} item{cart.count === 1 ? "" : "s"} ready to order.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {cart.items.map(({ product, qty, lineTotal }) => (
            <div
              key={product.id}
              className="mj-rise flex gap-4 rounded-2xl border border-mj-beige bg-white p-3 sm:p-4"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-mj-beige">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium text-mj-ink">{product.name}</h2>
                    <p className="mt-0.5 text-sm text-mj-brown">
                      ₹{product.price} each
                    </p>
                  </div>
                  <span className="font-semibold text-mj-green">
                    ₹{lineTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease ${product.name}`}
                      onClick={() => cart.setQty(product.id, qty - 1)}
                      className="mj-press h-11 w-11 rounded-full border border-mj-beige text-mj-ink hover:bg-mj-cream sm:h-8 sm:w-8"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-medium text-mj-ink">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${product.name}`}
                      onClick={() => cart.setQty(product.id, qty + 1)}
                      className="mj-press h-11 w-11 rounded-full border border-mj-beige text-mj-ink hover:bg-mj-cream sm:h-8 sm:w-8"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.remove(product.id)}
                    className="inline-flex min-h-10 items-center text-xs font-medium text-mj-brown underline-offset-2 hover:text-mj-green hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href="/products"
              className="text-sm font-medium text-mj-green hover:underline"
            >
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={cart.clear}
              className="text-sm text-mj-brown hover:text-mj-green"
            >
              Clear cart
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-mj-beige bg-white p-5">
          <h2 className="text-lg font-medium text-mj-ink">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-mj-brown">
              <dt>Subtotal</dt>
              <dd>₹{cart.subtotal}</dd>
            </div>
            <div className="flex justify-between text-mj-brown">
              <dt>Shipping</dt>
              <dd>{cart.shipping === 0 ? "Free" : `₹${cart.shipping}`}</dd>
            </div>
            {cart.shipping > 0 && (
              <p className="rounded-lg bg-mj-cream/70 px-3 py-2 text-xs text-mj-brown">
                Add ₹{499 - cart.subtotal} more for free delivery.
              </p>
            )}
            <div className="flex justify-between border-t border-mj-beige pt-3 text-base font-semibold text-mj-ink">
              <dt>Total</dt>
              <dd className="text-mj-green">₹{cart.total}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => router.push("/booking")}
            className="mj-press mt-5 w-full rounded-full bg-mj-green px-5 py-3 text-sm font-medium text-white hover:bg-mj-green-700"
          >
            Continue to delivery
          </button>
          <p className="mt-2 text-center text-xs text-mj-brown">
            Sign in is required at the next step.
          </p>
        </aside>
      </div>
    </div>
  );
}
