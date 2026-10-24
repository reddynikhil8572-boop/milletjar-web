import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/products";
import AddToCart from "@/components/add-to-cart";
import Reveal from "@/components/reveal";

export const metadata = {
  title: "Shop | Millet Jar",
  description:
    "Browse the Millet Jar range. Add to cart, pay online or order on WhatsApp.",
};

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-mj-brown" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">Shop</span>
      </nav>

      <Reveal className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-mj-ink">Our millets</h1>
          <p className="mt-1 text-mj-brown">
            Farm sourced, cleaned and packed in small batches.
          </p>
        </div>
        <Link
          href="/cart"
          className="mj-press rounded-full border border-mj-green/30 px-4 py-2 text-sm font-medium text-mj-green hover:bg-mj-cream"
        >
          Go to cart →
        </Link>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={index * 80}>
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mj-beige transition-shadow hover:shadow-md">
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {!product.inStock && (
                <span className="absolute left-3 top-3 rounded-full bg-mj-ink/80 px-3 py-1 text-xs text-white">
                  Out of stock
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-medium text-mj-ink">
                  {product.name}
                </h2>
                <span className="shrink-0 rounded-full bg-mj-cream px-2.5 py-1 text-sm font-semibold text-mj-green">
                  ₹{product.price}
                </span>
              </div>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-mj-brown">
                {product.description}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {product.inStock ? (
                  <>
                    <AddToCart productId={product.id} />
                    <Link
                      href="/cart"
                      className="mj-press rounded-full border border-mj-beige px-4 py-2 text-center text-sm font-medium text-mj-ink hover:bg-mj-cream"
                    >
                      View cart
                    </Link>
                  </>
                ) : (
                  <span className="rounded-full bg-mj-cream px-4 py-2 text-center text-sm text-mj-brown">
                    Currently unavailable
                  </span>
                )}
              </div>
            </div>
            </article>
          </Reveal>
        ))}
      </div>

      <p className="mt-10 rounded-2xl border border-mj-beige bg-mj-cream/50 p-4 text-center text-sm text-mj-brown">
        Prices are in INR and include taxes. Delivery is free on orders over
        ₹499.
      </p>
    </div>
  );
}
