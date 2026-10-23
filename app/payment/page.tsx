import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { paymentConfigured } from "@/lib/env";
import { readDB } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import PaymentPanel from "@/components/payment-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment | Millet Jar",
  description: "Pay for your Millet Jar order securely or confirm on WhatsApp.",
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/payment");

  const params = await searchParams;
  const orderId = params.order;

  if (!orderId) {
    const unpaid = await readDB((db) =>
      db.orders
        .filter((o) => o.userId === auth.user.id && o.payment.status !== "paid")
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((o) => ({
          id: o.id,
          reference: o.reference,
          total: o.total,
          createdAt: o.createdAt,
        }))
    );

    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-mj-ink">Payment</h1>
        <p className="mt-1 text-mj-brown">
          Select an unpaid order to complete payment.
        </p>

        {unpaid.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-mj-beige bg-white p-8 text-center">
            <p className="text-mj-brown">You have no pending payments.</p>
            <Link
              href="/products"
              className="mt-5 inline-block rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {unpaid.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/payment?order=${order.id}`}
                  className="flex items-center justify-between rounded-2xl border border-mj-beige bg-white px-5 py-4 transition-colors hover:bg-mj-cream/50"
                >
                  <div>
                    <div className="font-medium text-mj-ink">
                      {order.reference}
                    </div>
                    <div className="text-xs text-mj-brown">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <span className="font-semibold text-mj-green">
                    ₹{order.total}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const order = await readDB((db) =>
    db.orders.find((o) => o.id === orderId && o.userId === auth.user.id)
  );

  // Never reveal whether an order exists if the user does not own it.
  if (!order) redirect("/payment");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-mj-ink">Payment</h1>
          <p className="mt-1 text-mj-brown">
            Nothing is charged until you confirm.
          </p>
        </div>
        <span className="rounded-full bg-mj-cream px-3 py-1 text-xs font-medium text-mj-green">
          Step 2 of 2
        </span>
      </div>

      <PaymentPanel
        order={{
          id: order.id,
          reference: order.reference,
          total: order.total,
          paymentStatus: order.payment.status,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          items: order.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            lineTotal: item.lineTotal,
          })),
        }}
        whatsappUrl={whatsappLink(order)}
        onlineConfigured={paymentConfigured()}
      />
    </div>
  );
}
