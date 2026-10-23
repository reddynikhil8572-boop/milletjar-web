import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata = {
  title: "About | Millet Jar",
  description:
    "Millet Jar brings naturally sourced millets from farm to your family.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="text-xs text-mj-brown" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">About</span>
      </nav>

      <div className="mt-4 grid items-center gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold text-mj-ink">
            Simple food, honestly sourced.
          </h1>
          <p className="mt-4 leading-relaxed text-mj-brown">
            Millet Jar started with a simple idea: make everyday millets easy to
            buy, easy to cook with, and easy to trust. We work with farming
            partners, clean and pack in small batches, and keep the range
            focused on what families actually cook.
          </p>
          <p className="mt-3 leading-relaxed text-mj-brown">
            Nothing exotic, no long ingredient lists — just grains that belong on
            your table.
          </p>
          <div className="mt-6">
            <Link
              href="/products"
              className="inline-block rounded-full bg-mj-green px-6 py-3 text-sm font-medium text-white hover:bg-mj-green-700"
            >
              Shop the range
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-mj-beige">
          <Image
            src="/images/WhatsApp Image 2026-10-22 at 5.17.24 PM.jpeg"
            alt="Millet Jar produce"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Farm sourced",
            body: "Grains selected with our farming partners.",
          },
          {
            title: "Small batches",
            body: "Cleaned and packed close to dispatch.",
          },
          {
            title: "Everyday use",
            body: "Millets that fit regular home cooking.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-mj-beige bg-white p-5"
          >
            <h2 className="text-sm font-semibold text-mj-ink">{item.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-mj-brown">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-mj-brown">
        {SITE.tagline} Find us at{" "}
        <a href={SITE.url} className="text-mj-green hover:underline">
          {SITE.domain}
        </a>{" "}
        and{" "}
        <a
          href={`https://www.instagram.com/${SITE.instagram.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mj-green hover:underline"
        >
          {SITE.instagram}
        </a>
        .
      </p>
    </div>
  );
}
