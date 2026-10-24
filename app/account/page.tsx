import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { readDB } from "@/lib/store";
import SignOutButton from "@/components/sign-out";
import Reveal from "@/components/reveal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My account | Millet Jar",
  description: "View your Millet Jar profile and order history.",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  packed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  shipped: "bg-purple-50 text-purple-700 ring-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

export default async function AccountPage() {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/account");

  const orders = await readDB((db) =>
    db.orders
      .filter((order) => order.userId === auth.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  const paidCount = orders.filter((o) => o.payment.status === "paid").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mj-green text-lg font-semibold text-white">
            {auth.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-mj-ink">
              {auth.user.name}
            </h1>
            <p className="text-sm text-mj-brown">{auth.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="mj-press rounded-full bg-mj-green px-4 py-2 text-sm font-medium text-white hover:bg-mj-green-700"
          >
            Shop again
          </Link>
          <SignOutButton />
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Reveal delay={0}>
        <div className="h-full rounded-2xl border border-mj-beige bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Orders
          </div>
          <div className="mt-1 text-2xl font-semibold text-mj-ink">
            {orders.length}
          </div>
        </div>
        </Reveal>
        <Reveal delay={60}>
        <div className="h-full rounded-2xl border border-mj-beige bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Paid
          </div>
          <div className="mt-1 text-2xl font-semibold text-mj-ink">
            {paidCount}
          </div>
        </div>
        </Reveal>
        <Reveal delay={120}>
        <div className="h-full rounded-2xl border border-mj-beige bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Member since
          </div>
          <div className="mt-1 text-sm font-medium text-mj-ink">
            {new Date(auth.user.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        </Reveal>
      </div>

      <Reveal>
        <h2 className="mt-10 text-lg font-medium text-mj-ink">Order history</h2>
      </Reveal>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-mj-beige bg-white p-8 text-center">
          <p className="text-mj-brown">No orders yet.</p>
          <Link
            href="/products"
            className="mj-press mt-5 inline-block rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order, index) => (
            <Reveal
              as="li"
              key={order.id}
              delay={Math.min(index * 70, 350)}
              className="rounded-2xl border border-mj-beige bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/order/${order.id}`}
                    className="font-medium text-mj-ink hover:text-mj-green"
                  >
                    {order.reference}
                  </Link>
                  <div className="mt-0.5 text-xs text-mj-brown">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {order.items.reduce((sum, item) => sum + item.qty, 0)}{" "}
                    item
                    {order.items.reduce((sum, item) => sum + item.qty, 0) === 1
                      ? ""
                      : "s"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${
                      STATUS_STYLES[order.status] ||
                      "bg-mj-cream text-mj-brown ring-mj-beige"
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="font-semibold text-mj-ink">
                    ₹{order.total}
                  </span>
                </div>
              </div>

              {order.payment.status !== "paid" &&
                order.status !== "cancelled" && (
                  <div className="mt-3 flex gap-2 border-t border-mj-beige pt-3">
                    <Link
                      href={`/payment?order=${order.id}`}
                      className="mj-press rounded-full bg-mj-green px-4 py-1.5 text-xs font-medium text-white hover:bg-mj-green-700"
                    >
                      Complete payment
                    </Link>
                    <Link
                      href={`/order/${order.id}`}
                      className="mj-press rounded-full border border-mj-beige px-4 py-1.5 text-xs font-medium text-mj-ink hover:bg-mj-cream"
                    >
                      View order
                    </Link>
                  </div>
                )}
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
