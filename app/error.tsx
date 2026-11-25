"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Catches render errors in route pages (not the root layout). */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    const digest =
      error instanceof Error
        ? (error as Error & { digest?: string }).digest
        : undefined;
    console.error("[milletjar] page error", error, digest || "");
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-mj-beige bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-mj-brown">
          (╯°□°）╯︵ 🌾 — Oops! We dropped the millet sack. Give us a second to sweep up the grains and hit refresh!
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-mj-ink">
          We couldn&rsquo;t load this page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mj-brown">
          Please try again. If the problem continues, contact us on WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="mj-press rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="mj-press rounded-full border border-mj-beige px-5 py-2.5 text-sm font-medium text-mj-ink hover:bg-mj-cream"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
