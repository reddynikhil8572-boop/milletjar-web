"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { mutate } from "@/lib/api-client";

type OrderResponse = {
  order: { id: string; reference: string; total: number };
  whatsappUrl: string;
  next: string;
};

const SLOTS = [
  "Morning (9am – 12pm)",
  "Afternoon (12pm – 4pm)",
  "Evening (4pm – 8pm)",
];

export default function BookingForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [slot, setSlot] = useState(SLOTS[0]);
  const [busy, setBusy] = useState<"whatsapp" | "online" | null>(null);
  const [error, setError] = useState("");

  const valid =
    cart.items.length > 0 &&
    name.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    address.trim().length >= 5 &&
    pincode.trim().length >= 4;

  async function submit(method: "whatsapp" | "online") {
    if (!valid || busy) return;
    setBusy(method);
    setError("");

    const result = await mutate<OrderResponse>("/api/orders", {
      items: cart.lines,
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        city: city.trim() || undefined,
        slot,
      },
      method,
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }

    const { whatsappUrl, next } = result.data;
    cart.clear();

    if (method === "whatsapp") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
    router.push(`${next}?new=1`);
  }

  if (cart.ready && cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-mj-beige bg-white p-8 text-center">
        <h2 className="text-lg font-medium text-mj-ink">Your cart is empty</h2>
        <p className="mt-1 text-sm text-mj-brown">
          Add products before adding delivery details.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit("online");
        }}
        className="space-y-4 rounded-2xl border border-mj-beige bg-white p-5 sm:p-6"
      >
        <div>
          <h2 className="text-lg font-medium text-mj-ink">Delivery details</h2>
          <p className="mt-0.5 text-sm text-mj-brown">
            Signed in as {defaultEmail}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
              Full name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
              Phone
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              minLength={10}
              maxLength={15}
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
            Address
          </span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            minLength={5}
            maxLength={300}
            rows={3}
            autoComplete="street-address"
            placeholder="House, street, area"
            className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
              City
            </span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={80}
              autoComplete="address-level2"
              className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
              Pincode
            </span>
            <input
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              required
              minLength={4}
              maxLength={10}
              inputMode="numeric"
              autoComplete="postal-code"
              className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
            Preferred delivery slot
          </span>
          <select
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-mj-beige bg-white px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
          >
            {SLOTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={!valid || busy !== null}
            className="flex-1 rounded-full bg-mj-green px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-mj-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "online" ? "Creating order…" : "Continue to payment"}
          </button>
          <button
            type="button"
            onClick={() => submit("whatsapp")}
            disabled={!valid || busy !== null}
            className="flex-1 rounded-full border border-mj-green px-5 py-3 text-sm font-medium text-mj-green transition-colors hover:bg-mj-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "whatsapp" ? "Opening WhatsApp…" : "Order on WhatsApp"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-mj-brown">
          Final prices are calculated on our server from the current catalog
          before your order is created.
        </p>
      </form>

      <aside className="h-fit rounded-2xl border border-mj-beige bg-white p-5">
        <h2 className="text-lg font-medium text-mj-ink">Order summary</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {cart.items.map(({ product, qty, lineTotal }) => (
            <li key={product.id} className="flex justify-between gap-3">
              <span className="text-mj-brown">
                {product.name} × {qty}
              </span>
              <span className="shrink-0 text-mj-ink">₹{lineTotal}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-mj-beige pt-3 text-sm">
          <div className="flex justify-between text-mj-brown">
            <dt>Subtotal</dt>
            <dd>₹{cart.subtotal}</dd>
          </div>
          <div className="flex justify-between text-mj-brown">
            <dt>Shipping</dt>
            <dd>{cart.shipping === 0 ? "Free" : `₹${cart.shipping}`}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold text-mj-ink">
            <dt>Total</dt>
            <dd className="text-mj-green">₹{cart.total}</dd>
          </div>
        </dl>
        <Link
          href="/cart"
          className="mt-4 block text-center text-xs text-mj-brown hover:text-mj-green"
        >
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
