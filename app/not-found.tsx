import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-mj-beige bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-mj-brown">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-mj-ink">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mj-brown">
          The page you are looking for may have moved or no longer exists.
        </p>
        <Link
          href="/"
          className="mj-press mt-6 inline-block rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
