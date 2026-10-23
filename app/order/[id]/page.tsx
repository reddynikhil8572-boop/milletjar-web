import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { readDB } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  packed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  shipped: "bg-purple-50 text-purple-700 ring-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; paid?: string }>;
}) {
  const auth = await requireUser();
  if (!auth) {
    const { id } = await params;
    redirect(`/login?next=/order/${id}`);
  }

  const { id } = await params;
  const flags = await searchParams;

  const order = await readDB((db) =>
    db.orders.find((o) => o.id === id && o.userId === auth.user.id)
  );
  if (!order) notFound();

  const isPaid = order.payment.status === "paid";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {flags.new && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Order created. We will confirm it shortly.
        </div>
      )}
      {flags.paid && isPaid && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment received. Thank you!
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mj-ink">
            Order {order.reference}
          </h1>
          <p className="mt-1 text-sm text-mj-brown">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${
            STATUS_STYLES[order.status] || "bg-mj-cream text-mj-brown ring-mj-beige"
          }`}
        >
          {order.status}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-mj-beige bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mj-brown">
          Items
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="flex justify-between gap-3">
              <span className="text-mj-brown">
                {item.name} × {item.qty}{" "}
                <span className="text-mj-brown/70">(₹{item.price} each)</span>
              </span>
              <span className="text-mj-ink">₹{item.lineTotal}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-mj-beige pt-3 text-sm">
          <div className="flex justify-between text-mj-brown">
            <dt>Subtotal</dt>
            <dd>₹{order.subtotal}</dd>
          </div>
          <div className="flex justify-between text-mj-brown">
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? "Free" : `₹${order.shipping}`}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold text-mj-ink">
            <dt>Total</dt>
            <dd className="text-mj-green">₹{order.total}</dd>
          </div>
          <div className="flex justify-between pt-1 text-xs text-mj-brown">
            <dt>Payment</dt>
            <dd className="capitalize">
              {order.payment.method} · {order.payment.status}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-mj-beige bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mj-brown">
          Delivery
        </h2>
        <div className="mt-3 space-y-1 text-sm text-mj-ink">
          <p className="font-medium">{order.customer.name}</p>
          <p className="text-mj-brown">{order.customer.phone}</p>
          <p className="text-mj-brown">
            {order.customer.address}
            {order.customer.city ? `, ${order.customer.city}` : ""} —{" "}
            {order.customer.pincode}
          </p>
          {order.customer.slot && (
            <p className="text-mj-brown">Slot: {order.customer.slot}</p>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={whatsappLink(order)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
        >
          Send order on WhatsApp
        </a>
        {!isPaid && order.status !== "cancelled" && (
          <Link
            href={`/payment?order=${order.id}`}
            className="rounded-full border border-mj-green px-5 py-2.5 text-sm font-medium text-mj-green hover:bg-mj-cream"
          >
            Complete payment
          </Link>
        )}
        <Link
          href="/account"
          className="rounded-full border border-mj-beige px-5 py-2.5 text-sm font-medium text-mj-ink hover:bg-mj-cream"
        >
          My orders
        </Link>
      </div>
    </div>
  );
}
