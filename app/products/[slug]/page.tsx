import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/add-to-cart";
import Reveal from "@/components/reveal";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/pricing";
import {
  LOW_STOCK_THRESHOLD,
  getProducts,
  isAvailable,
  type Product,
} from "@/lib/products";

export const dynamic = "force-dynamic";

/** Percentage saved, shown as an orange chip when MRP is above the price. */
function discountPercent(product: Product): number {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = (await getProducts()).find((p) => p.slug === slug);
  if (!product) return { title: "Product not found | Millet Jar" };
  return {
    title: `${product.name} | Millet Jar`,
    description:
      product.description ||
      `${product.name} from Millet Jar. Farm sourced, cleaned and packed in small batches.`,
  };
}

const CATEGORY_LABEL: Record<Product["category"], string> = {
  millet: "Millet",
  mix: "Millet mix",
  snack: "Snack",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const off = discountPercent(product);
  const available = isAvailable(product);
  const tracked = product.stock !== null && product.stock !== undefined;
  const lowStock = available && tracked && product.stock! <= LOW_STOCK_THRESHOLD;
  // Related products: same category first (in stock first), then the rest of
  // the catalog to fill up to three cards.
  const related = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      const categoryRank =
        (a.category === product.category ? 0 : 1) -
        (b.category === product.category ? 0 : 1);
      if (categoryRank !== 0) return categoryRank;
      return (a.inStock ? 0 : 1) - (b.inStock ? 0 : 1);
    })
    .slice(0, 3);
  const hasRelated = related.some((p) => p.category === product.category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-mj-brown" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <Link href="/products" className="hover:text-mj-green">
          Shop
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 md:grid-cols-2 md:gap-12">
        <Reveal className="relative">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-mj-cream ring-1 ring-mj-beige">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            {!available && (
              <span className="absolute bottom-4 left-4 rounded-full bg-mj-ink/80 px-4 py-1.5 text-xs text-white">
                Out of stock
              </span>
            )}
            {product.labels.length > 0 && (
              <span className="absolute left-4 top-4 flex flex-wrap gap-1.5">
                {product.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-mj-green shadow-sm"
                  >
                    {label}
                  </span>
                ))}
              </span>
            )}
            {off > 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-mj-orange px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {off}% off
              </span>
            )}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className="text-xs font-medium uppercase tracking-wide text-mj-green">
            {CATEGORY_LABEL[product.category] ?? product.category}
          </p>

          <h1 className="mt-2 text-3xl font-semibold leading-tight text-mj-ink">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold text-mj-green">
              ₹{product.price}
            </span>
            {product.compareAtPrice !== null &&
              product.compareAtPrice > product.price && (
                <>
                  <span className="text-lg text-mj-brown line-through">
                    ₹{product.compareAtPrice}
                  </span>              <span className="rounded-full bg-mj-orange/15 px-2.5 py-1 text-xs font-semibold text-mj-orange">
                You save ₹{product.compareAtPrice - product.price}
              </span>
                </>
              )}
            {lowStock && (
              <span className="mj-pop rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                Only {product.stock} left
              </span>
            )}
          </div>

          <p className="mt-5 text-base leading-relaxed text-mj-brown">
            {product.description ||
              "Farm sourced, cleaned and packed in small batches."}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-mj-beige bg-white p-3">
              <dt className="text-xs text-mj-brown">Availability</dt>
              <dd
                className={`mt-0.5 font-medium ${
                  !available
                    ? "text-red-600"
                    : lowStock
                      ? "text-amber-600"
                      : "text-mj-ink"
                }`}
              >
                {!available
                  ? "Out of stock"
                  : tracked
                    ? `${product.stock} in stock`
                    : "In stock"}
              </dd>
            </div>
            <div className="rounded-2xl border border-mj-beige bg-white p-3">
              <dt className="text-xs text-mj-brown">Free delivery</dt>
              <dd className="mt-0.5 font-medium text-mj-ink">
                Over ₹{FREE_SHIPPING_THRESHOLD}
              </dd>
            </div>
            <div className="rounded-2xl border border-mj-beige bg-white p-3">
              <dt className="text-xs text-mj-brown">Shipping fee</dt>
              <dd className="mt-0.5 font-medium text-mj-ink">
                ₹{SHIPPING_FEE} below that
              </dd>
            </div>
            <div className="rounded-2xl border border-mj-beige bg-white p-3">
              <dt className="text-xs text-mj-brown">Shipped</dt>
              <dd className="mt-0.5 font-medium text-mj-ink">
                Across India
              </dd>
            </div>
          </dl>

          <div className="mt-6 max-w-sm">
            <AddToCart
              productId={product.id}
              inStock={available}
              max={tracked ? product.stock! : undefined}
              wide
            />
            <p className="mt-3 text-xs text-mj-brown">
              Pay online securely, or confirm your order on WhatsApp at the
              next step.
            </p>
          </div>

          <Link
            href="/products"
            className="mt-6 inline-block text-sm font-medium text-mj-green hover:underline"
          >
            ← Back to all products
          </Link>
        </Reveal>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-mj-ink">
            {hasRelated
              ? `More ${CATEGORY_LABEL[product.category] ?? product.category} picks`
              : "More from the store"}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {related.map((other) => (
              <Link
                key={other.id}
                href={`/products/${other.slug}`}
                className="group overflow-hidden rounded-2xl border border-mj-beige bg-white transition-shadow hover:shadow-md"
              >
                <span className="relative block aspect-square overflow-hidden">
                  <Image
                    src={other.image}
                    alt={other.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs font-medium text-mj-ink">
                    {other.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-mj-green">
                    ₹{other.price}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
