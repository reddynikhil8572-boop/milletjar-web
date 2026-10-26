import Image from "next/image";
import Link from "next/link";
import {
  LOW_STOCK_THRESHOLD,
  isAvailable,
  type Product,
} from "@/lib/products";
import AddToCart from "./add-to-cart";

/** Percentage saved, shown as an orange chip when MRP is above the price. */
function discountPercent(product: Product): number {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}

/**
 * Compact catalog card used on the home page and the shop grid.
 *
 * The mobile layout is deliberately information-dense: two cards fit per row
 * at 320px, so the image is square (contained, never cropped or stretched),
 * the description is hidden below `sm`, and name/price/stock/Buy stay in a
 * fixed vertical rhythm so neighbouring cards line up.
 */
export default function ProductCard({
  product,
  showDescription = true,
  showCartLink = false,
}: {
  product: Product;
  showDescription?: boolean;
  showCartLink?: boolean;
}) {
  const off = discountPercent(product);
  const available = isAvailable(product);
  const tracked = product.stock !== null && product.stock !== undefined;
  const low =
    available && tracked && product.stock! <= LOW_STOCK_THRESHOLD;

  const status = !available
    ? "Out of stock"
    : low
      ? `Only ${product.stock} left`
      : "In stock";
  const statusTone = !available
    ? "text-red-700"
    : low
      ? "text-amber-700"
      : "text-mj-green";
  const dotTone = !available
    ? "bg-red-500"
    : low
      ? "bg-amber-500"
      : "bg-mj-green";

  return (
    <article
      data-product-card
      className="mj-product-card group flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(31,41,55,0.04)] ring-1 ring-mj-beige/90 sm:rounded-2xl"
    >
      <Link
        href={`/products/${product.slug}`}
        data-product-media
        className="relative block aspect-square w-full overflow-hidden bg-[#f6ebe4]"
        aria-label={`View ${product.name}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw"
          className="mj-product-card__image object-contain object-center"
        />

        {(product.labels.length > 0 || off > 0) && (
          <span className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1 sm:inset-x-2 sm:top-2">
            {product.labels.length > 0 ? (
              <span className="flex min-w-0 flex-col items-start gap-1">
                {product.labels.map((label, index) => (
                  <span
                    key={label}
                    className={`max-w-full truncate rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-mj-green shadow-sm sm:px-2 sm:py-1 sm:text-[11px] ${
                      index > 0 ? "hidden sm:inline-block" : ""
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}

            {off > 0 && (
              <span className="shrink-0 rounded-full bg-mj-orange px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm sm:px-2 sm:py-1 sm:text-[11px]">
                {off}% off
              </span>
            )}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <h3
          data-product-name
          className="min-h-[2.2rem] text-[13px] font-medium leading-[1.25] text-mj-ink sm:min-h-[2.5rem] sm:text-sm"
        >
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 hover:text-mj-green"
          >
            {product.name}
          </Link>
        </h3>

        {showDescription && (
          <p className="mt-1 hidden flex-1 text-xs leading-snug text-mj-brown line-clamp-2 sm:block">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span
              data-product-price
              className="text-[15px] font-semibold leading-none text-mj-green sm:text-base"
            >
              ₹{product.price}
            </span>
            {product.compareAtPrice !== null &&
              product.compareAtPrice > product.price && (
                <span className="text-[10px] leading-none text-mj-brown line-through sm:text-xs">
                  ₹{product.compareAtPrice}
                </span>
              )}
          </div>

          <p
            data-product-stock
            className={`mt-1 flex items-center gap-1 text-[11px] font-medium leading-none ${statusTone}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`}
            />
            {status}
          </p>

          <div data-product-buy className="mt-2">
            <AddToCart
              productId={product.id}
              inStock={available}
              compact
              max={tracked ? product.stock! : undefined}
            />
          </div>

          {showCartLink && available && (
            <Link
              href="/cart"
              className="mt-1 hidden text-center text-[12px] font-medium text-mj-green hover:underline sm:block"
            >
              View cart
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
