import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/config";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/product-card";
import Reveal from "@/components/reveal";

// Admin edits prices, labels and stock, so the catalog is read per request.
export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Pick your millets",
    body: "Choose from our farm-sourced range and add them to your cart.",
  },
  {
    title: "Add delivery details",
    body: "Tell us where to deliver and pick a convenient time slot.",
  },
  {
    title: "Pay or confirm on WhatsApp",
    body: "Pay online securely, or send your order summary to us on WhatsApp.",
  },
];

export default async function Home() {
  const products = await getProducts();
  const featured = products.slice(0, 3);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-mj-cream/70 via-white to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mj-orange/10 blur-3xl"
        />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-mj-beige bg-white px-3 py-1 text-xs font-medium text-mj-green">
                <span className="h-1.5 w-1.5 rounded-full bg-mj-orange" />
                Fresh from Farm to Your Family
              </span>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-mj-ink md:text-5xl">
                Wholesome millets,
                <span className="block text-mj-green">
                  made part of every meal.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-lg leading-relaxed text-mj-brown">
                Naturally sourced grains, cleaned with care and packed in small
                batches. Simple food for everyday cooking.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="mj-press rounded-full bg-mj-green px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-mj-green-700"
                >
                  Shop millets
                </Link>
                <Link
                  href="/cart"
                  className="mj-press rounded-full border border-mj-green/30 px-6 py-3 text-sm font-medium text-mj-green hover:bg-mj-cream"
                >
                  View cart
                </Link>
              </div>

              <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-mj-beige pt-6">
                <div>
                  <dt className="text-xs text-mj-brown">Free delivery</dt>
                  <dd className="text-sm font-semibold text-mj-ink">Over ₹499</dd>
                </div>
                <div>
                  <dt className="text-xs text-mj-brown">Shipped</dt>
                  <dd className="text-sm font-semibold text-mj-ink">Across India</dd>
                </div>
                <div>
                  <dt className="text-xs text-mj-brown">Support</dt>
                  <dd className="text-sm font-semibold text-mj-ink">On WhatsApp</dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={120} className="relative">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-mj-beige">
                <Image
                  src="/images/og-logo.jpg"
                  alt="Millet Jar product range"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-5 left-4 rounded-2xl border border-mj-beige bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                <div className="text-[11px] uppercase tracking-wide text-mj-brown">
                  Order any way you like
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm font-medium text-mj-ink">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-mj-green" />
                    Online payment
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-mj-orange" />
                    WhatsApp
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-mj-ink md:text-3xl">
              Popular picks
            </h2>
            <p className="mt-1 text-mj-brown">
              Everyday millets our customers come back for.
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-mj-green hover:underline"
          >
            View all products →
          </Link>
        </Reveal>

        <div
          data-product-grid
          className="mt-5 grid grid-cols-2 gap-3 sm:mt-7 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
        >
          {featured.map((product, index) => (
            <Reveal key={product.id} delay={index * 70} className="h-full">
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-mj-beige bg-mj-cream/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-mj-ink md:text-3xl">
            How ordering works
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 90}>
                <div className="h-full rounded-2xl border border-mj-beige bg-white p-4 md:p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mj-green/10 text-sm font-semibold text-mj-green">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-medium text-mj-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mj-brown">
                  {step.body}
                </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal className="overflow-hidden rounded-3xl bg-mj-green px-6 py-10 text-white sm:px-10">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Not sure what to start with?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
                Message us on WhatsApp and we will help you choose a millet that
                fits your everyday cooking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link
                href="/contact"
                className="mj-press rounded-full bg-white px-6 py-3 text-sm font-medium text-mj-green hover:bg-mj-cream"
              >
                Talk to us
              </Link>
              <a
                href={`https://www.instagram.com/${SITE.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mj-press rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                {SITE.instagram}
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
