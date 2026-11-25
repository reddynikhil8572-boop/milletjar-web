"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps customer-facing order states current when an admin updates an order
 * in another tab or session. `router.refresh()` re-runs the dynamic server
 * page and clears the route's client cache without a full page reload.
 */
export default function OrderStatusRefresh({
  intervalMs = 15_000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = 0;
    const refresh = () => {
      const now = Date.now();
      // Focus and visibilitychange can fire together when switching tabs.
      if (now - lastRefresh < 1_000) return;
      lastRefresh = now;
      router.refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
