import Link from "next/link";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/product-card";
import Reveal from "@/components/reveal";

// Admin edits prices, labels and stock, so the catalog is read per request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop | Millet Jar",
  description:
    "Browse the Millet Jar range. Add to cart, pay online or order on WhatsApp.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 pt-4 sm:px-6 sm:py-10 lg:px-8">
      <nav
        className="hidden text-xs text-mj-brown sm:flex"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">Shop</span>
      </nav>

      <Reveal className="mt-0 sm:mt-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold leading-tight text-mj-ink sm:text-3xl">
            Our millets
          </h1>
          <Link
            href="/cart"
            className="mj-press inline-flex shrink-0 items-center gap-1 rounded-full border border-mj-green/30 px-2.5 py-1.5 text-[11px] font-medium text-mj-green hover:bg-mj-cream sm:px-3 sm:text-sm"
          >
            Go to cart <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="mt-1.5 max-w-lg text-[13px] leading-snug text-mj-brown sm:mt-1 sm:text-base">
          Farm sourced, cleaned and packed in small batches.
        </p>
      </Reveal>

      <div
        data-product-grid
        className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-7 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {products.map((product, index) => (
          <Reveal
            key={product.id}
            delay={Math.min(4, Math.floor(index / 2)) * 70}
            className="h-full"
          >
            <ProductCard product={product} showCartLink />
          </Reveal>
        ))}
      </div>

      <p className="mt-8 rounded-2xl border border-mj-beige bg-mj-cream/50 p-4 text-center text-sm text-mj-brown sm:mt-10">
        Prices are in INR and include taxes. Delivery is free on orders over
        ₹499.
      </p>
    </div>
  );
}
