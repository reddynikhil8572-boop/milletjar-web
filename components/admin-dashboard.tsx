"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminOrders from "./admin-orders";
import AdminProducts from "./admin-products";
import AdminPromotions from "./admin-promotions";

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "promotions", label: "Promotions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [tab, setTab] = useState<TabId>("orders");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        csrfToken?: string;
      } | null;
      if (!data?.csrfToken) {
        router.replace("/admin/login");
        return;
      }
      setCsrf(data.csrfToken);
    } catch {
      // Network blip; panels surface their own errors once they have a token.
    }
  }, [router]);

  useEffect(() => {
    // State is only set after an await, so this does not cascade on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function signOut() {
    if (csrf) {
      await fetch("/api/admin/auth/me", {
        method: "POST",
        credentials: "same-origin",
        headers: { "x-csrf-token": csrf },
      });
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mj-ink">
            Millet Jar admin
          </h1>
          <p className="text-sm text-mj-brown">Signed in as {email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full border border-mj-beige px-4 py-2 text-sm font-medium text-mj-ink hover:bg-mj-cream"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full bg-mj-ink px-4 py-2 text-sm font-medium text-white hover:bg-mj-ink/90"
          >
            Sign out
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-mj-beige"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-mj-green text-mj-green"
                : "border-transparent text-mj-brown hover:text-mj-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {csrf ? (
        tab === "orders" ? (
          <AdminOrders csrf={csrf} />
        ) : tab === "products" ? (
          <AdminProducts csrf={csrf} />
        ) : (
          <AdminPromotions csrf={csrf} />
        )
      ) : (
        <p className="mt-6 text-sm text-mj-brown">Checking your session…</p>
      )}
    </div>
  );
}
