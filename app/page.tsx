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
    <div className="mj-home-page overflow-hidden">
      <section
        aria-labelledby="home-hero-title"
        className="mj-home-hero relative mx-auto mt-3 max-w-7xl overflow-hidden rounded-3xl border border-white/80 shadow-sm sm:mt-8"
      >
        <div
          aria-hidden="true"
          className="mj-home-hero-glow pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 md:py-20 lg:px-8">
          <div className="grid items-center gap-8 sm:gap-10 md:grid-cols-2 md:gap-12">
            <Reveal delay={80}>
              <span className="mj-home-hero-eyebrow inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase text-mj-green">
                <span className="mj-home-hero-dot h-1.5 w-1.5 rounded-full" />
                A little goodness for every day
              </span>

              <h1
                id="home-hero-title"
                className="mt-4 max-w-xl text-4xl font-semibold leading-[1.06] tracking-tight text-mj-ink sm:mt-5 sm:text-5xl md:text-6xl"
              >
                Make room for
                <span className="block text-mj-green">
                  feel-good food.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-mj-brown sm:text-lg">
                Wholesome millets and ready-to-cook mixes for the meals you
                already love. Thoughtfully packed for your everyday kitchen.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
                <Link
                  href="/products"
                  className="mj-press rounded-full bg-mj-green px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-mj-green-700"
                >
                  Explore the collection
                </Link>
                <Link
                  href="#how-ordering-works"
                  className="mj-press rounded-full border border-mj-green/30 bg-white/70 px-6 py-3 text-sm font-medium text-mj-green hover:bg-white"
                >
                  How it works
                </Link>
              </div>

              <dl className="mj-home-hero-stats mt-7 grid max-w-lg grid-cols-3 gap-2 border-t pt-4 sm:mt-9 sm:gap-4 sm:pt-6">
                <div>
                  <dt className="text-xs text-mj-brown">
                    Free delivery
                  </dt>
                  <dd className="mt-0.5 text-xs font-semibold text-mj-ink sm:text-sm">
                    Over ₹499
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-mj-brown">
                    Delivered
                  </dt>
                  <dd className="mt-0.5 text-xs font-semibold text-mj-ink sm:text-sm">
                    Across India
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-mj-brown">
                    Here to help
                  </dt>
                  <dd className="mt-0.5 text-xs font-semibold text-mj-ink sm:text-sm">
                    WhatsApp support
                  </dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={160} className="relative">
              <div
                className="mj-home-hero-art"
                style={{ position: "relative" }}
              >
                <div
                  aria-hidden="true"
                  className="mj-home-hero-art-backdrop"
                />
                <div
                  className="mj-home-hero-product mj-home-hero-product--main mj-home-hero-image"
                  style={{ position: "absolute" }}
                >
                  <Image
                    src="/images/WhatsApp Image 2026-10-22 at 5.17.25 PM (1).jpeg"
                    alt="Millet Jar multigrain dosa mix"
                    fill
                    sizes="(max-width: 768px) 48vw, 28vw"
                    className="object-contain"
                    preload
                  />
                </div>
                <div
                  className="mj-home-hero-product mj-home-hero-product--top"
                  style={{ position: "absolute" }}
                >
                  <Image
                    src="/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (1).jpeg"
                    alt="Millet Jar pearl millet dosa mix"
                    fill
                    sizes="(max-width: 768px) 34vw, 20vw"
                    className="object-contain"
                  />
                </div>
                <div
                  className="mj-home-hero-product mj-home-hero-product--bottom"
                  style={{ position: "absolute" }}
                >
                  <Image
                    src="/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (2).jpeg"
                    alt="Millet Jar sesame magic balls"
                    fill
                    sizes="(max-width: 768px) 34vw, 20vw"
                    className="object-contain"
                  />
                </div>
                <div className="mj-home-hero-note rounded-full bg-white px-3 py-2 text-xs font-medium text-mj-green shadow-md">
                  Thoughtfully packed for your pantry
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-[#fffdf5] via-[#f8fcf7] to-[#e9f7f5] p-4 shadow-sm sm:rounded-[2.5rem] sm:p-8 lg:p-10">
          <Reveal
            delay={80}
            className="flex flex-wrap items-end justify-between gap-3"
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mj-green">
                Made for everyday meals
              </span>
              <h2 className="mt-2 text-2xl font-semibold text-mj-ink md:text-3xl">
                From our range
              </h2>
              <p className="mt-1 text-mj-brown">
                Explore wholesome grains and blends for your kitchen.
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
            className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-7 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
          >
            {featured.map((product, index) => (
              <Reveal
                key={product.id}
                delay={80 + index * 80}
                className="h-full"
              >
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-ordering-works"
        className="mx-auto max-w-7xl scroll-mt-24 px-3 py-2 sm:px-6 sm:py-5 lg:px-8"
      >
        <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-[#dff5e8] via-[#f6fbf3] to-[#fce9df] p-4 shadow-sm sm:rounded-[2.5rem] sm:p-8 lg:p-10">
          <Reveal delay={80} className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mj-green">
              Thoughtful from farm to family
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-mj-ink md:text-3xl">
              Why Millet Jar?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mj-brown sm:text-base">
              Simple grains, chosen and handled with care for your everyday
              table.
            </p>
          </Reveal>

          <div className="mt-4 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              "Farm-sourced grains",
              "Cleaned with care",
              "Packed in small batches",
              "Made for everyday meals",
            ].map((promise, index) => (
              <Reveal
                key={promise}
                delay={80 + index * 80}
                className="h-full"
              >
                <div className="flex h-full items-center gap-3 rounded-xl border border-white/90 bg-white/80 p-3 shadow-sm sm:rounded-2xl sm:p-5 sm:flex-col sm:items-start">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf5d9] text-sm text-mj-green sm:h-11 sm:w-11 sm:text-lg">
                    <span aria-hidden="true">{index + 1}</span>
                  </span>
                  <h3 className="text-sm font-semibold text-mj-ink sm:mt-1">
                    {promise}
                  </h3>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-3xl border border-white/80 bg-[#fffdf5] p-4 shadow-sm sm:rounded-[2.5rem] sm:p-8 lg:p-10">
          <Reveal>
            <h2 className="text-2xl font-semibold text-mj-ink md:text-3xl">
              How ordering works
            </h2>
            <div className="mt-4 grid gap-3 sm:mt-8 md:grid-cols-3 md:gap-5">
              {steps.map((step, index) => (
                <Reveal
                  key={step.title}
                  delay={80 + index * 80}
                  className="h-full"
                >
                  <div className="h-full rounded-xl border border-mj-beige/80 bg-white p-3 sm:rounded-2xl sm:p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mj-green/10 text-sm font-semibold text-mj-green">
                      {index + 1}
                    </span>
                    <h3 className="mt-3 text-base font-medium text-mj-ink sm:mt-4">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mj-brown">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pb-5 pt-1 sm:px-6 sm:pb-12 sm:pt-2 lg:px-8">
        <Reveal className="overflow-hidden rounded-3xl bg-mj-green px-5 py-6 text-white shadow-sm sm:rounded-[2.5rem] sm:px-10 sm:py-11">
          <div className="grid items-center gap-4 sm:gap-6 md:grid-cols-2">
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
