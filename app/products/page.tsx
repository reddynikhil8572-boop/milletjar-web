import Image from "next/image";
import Link from "next/link";
import {
  LOW_STOCK_THRESHOLD,
  getProducts,
  isAvailable,
  type Product,
} from "@/lib/products";
import AddToCart from "@/components/add-to-cart";
import Reveal from "@/components/reveal";

// Admin edits prices, labels and stock, so the catalog is read per request.
export const dynamic = "force-dynamic";

function discountPercent(product: Product): number {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}

export const metadata = {
  title: "Shop | Millet Jar",
  description:
    "Browse the Millet Jar range. Add to cart, pay online or order on WhatsApp.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-mj-brown" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">Shop</span>
      </nav>

      <Reveal className="mt-2 sm:mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-mj-ink sm:text-3xl">Our millets</h1>
          <p className="mt-1 text-mj-brown text-sm sm:text-base">
            Farm sourced, cleaned and packed in small batches.
          </p>
        </div>
        <Link
          href="/cart"
          className="mj-press rounded-full border border-mj-green/30 px-3 py-1.5 text-sm font-medium text-mj-green hover:bg-mj-cream"
        >
          Go to cart →
        </Link>
      </Reveal>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={Math.min(4, Math.floor(index / 2)) * 80} as="article">
            <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-mj-beige transition-all duration-200 hover:shadow-md">
              <Link
                href={`/products/${product.slug}`}
                className="relative block overflow-hidden"
                aria-label={`View ${product.name}`}
              >
                <div className="aspect-[4/3] sm:aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-400 group-hover:scale-[1.02]"
                  />
                </div>
                {!isAvailable(product) && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-mj-ink/85 px-2.5 py-0.5 text-[11px] text-white">
                    Out of stock
                  </span>
                )}
                {isAvailable(product) &&
                  product.stock !== null &&
                  product.stock !== undefined &&
                  product.stock <= LOW_STOCK_THRESHOLD && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                      Only {product.stock} left
                    </span>
                  )}
                {product.labels.length > 0 && (
                  <span className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {product.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-mj-green shadow-sm "
                      >
                        {label}
                      </span>
                    ))}
                  </span>
                )}
                {discountPercent(product) > 0 && (
                  <span
                    className="absolute right-2 top-2 rounded-full bg-mj-orange px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                  >
                    {discountPercent(product)}% off
                  </span>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium text-mj-ink leading-tight ">
                    <Link
                      href={`/products/${product.slug}`}
                      className="hover:text-mj-green"
                    >
                      {product.name}
                    </Link>
                  </h2>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="rounded-full bg-mj-cream px-2 py-0.5 text-xs font-semibold text-mj-green ">
                      ₹{product.price}
                    </span>
                    {product.compareAtPrice !== null &&
                      product.compareAtPrice > product.price && (
                        <>
                          <span className="text-[11px] text-mj-brown line-through ">
                            ₹{product.compareAtPrice}
                          </span>
                          <span className="rounded-full bg-mj-orange/15 px-1.5 py-0.5 text-[11px] font-semibold text-mj-orange">
                            Save ₹{product.compareAtPrice - product.price}
                          </span>
                        </>
                      )}
                  </span>
                </div>
                <p className="mt-1 flex-1 text-[12px] leading-snug text-mj-brown line-clamp-2">
                  {product.description}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <AddToCart
                    productId={product.id}
                    inStock={isAvailable(product)}
                    max={
                      product.stock === null || product.stock === undefined
                        ? undefined
                        : product.stock
                    }
                  />
                  {isAvailable(product) ? (
                    <Link
                      href="/cart"
                      className="block text-center text-[12px] font-medium text-mj-green hover:underline"
                    >
                      View cart
                    </Link>
                  ) : (
                    <span className="block text-center text-[12px] text-mj-brown">
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
