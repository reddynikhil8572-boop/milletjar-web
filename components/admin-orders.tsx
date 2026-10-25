"use client";

import { useCallback, useEffect, useState } from "react";

type AdminOrder = {
  id: string;
  reference: string;
  total: number;
  status: string;
  payment: { method: string; status: string };
  createdAt: number;
  customer: { name: string; phone: string; address: string; pincode: string };
  items: { name: string; qty: number }[];
};

type Stats = { total: number; paid: number; revenue: number; customers: number };

const STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrders({ csrf }: { csrf: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/orders${filter === "all" ? "" : `?status=${filter}`}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      if (!res.ok) {
        setError("Could not load orders.");
        return;
      }
      const data = (await res.json()) as { orders: AdminOrder[]; stats: Stats };
      setOrders(data.orders);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Network error while loading orders.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Initial data fetch. All state updates happen after an await, so this
    // does not cause a cascading render during mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function updateOrder(
    id: string,
    patch: { status?: string; paid?: boolean }
  ) {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not update the order.");
        return;
      }
      await load();
    } catch {
      setError("Network error while updating the order.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Orders", value: stats.total },
            { label: "Paid", value: stats.paid },
            { label: "Revenue", value: `₹${stats.revenue}` },
            { label: "Customers", value: stats.customers },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-mj-beige bg-white p-4"
            >
              <div className="text-xs uppercase tracking-wide text-mj-brown">
                {item.label}
              </div>
              <div className="mt-1 text-xl font-semibold text-mj-ink">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {["all", ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setLoading(true);
              setFilter(status);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === status
                ? "bg-mj-green text-white"
                : "border border-mj-beige text-mj-ink hover:bg-mj-cream"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-mj-beige bg-white">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-mj-cream"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-mj-brown">
            No orders for this filter yet.
          </p>
        ) : (
          <ul className="divide-y divide-mj-beige">
            {orders.map((order) => (
              <li key={order.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-mj-ink">
                        {order.reference}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          order.payment.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {order.payment.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-mj-brown">
                      {order.customer.name} · {order.customer.phone}
                    </div>
                    <div className="mt-0.5 text-xs text-mj-brown">
                      {order.items
                        .map((item) => `${item.name} × ${item.qty}`)
                        .join(", ")}
                    </div>
                    <div className="mt-1 text-xs text-mj-brown">
                      {order.customer.address}, {order.customer.pincode}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold text-mj-ink">
                      ₹{order.total}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(event) =>
                          updateOrder(order.id, { status: event.target.value })
                        }
                        className="rounded-full border border-mj-beige bg-white px-3 py-1.5 text-xs capitalize text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {order.payment.status !== "paid" && (
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => updateOrder(order.id, { paid: true })}
                          className="rounded-full bg-mj-green px-3 py-1.5 text-xs font-medium text-white hover:bg-mj-green-700 disabled:opacity-60"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
