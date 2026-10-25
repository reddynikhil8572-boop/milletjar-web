import { getProducts, isAvailable } from "./products";
import type { OrderItem } from "./types";

export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 49;
export const MAX_QTY_PER_ITEM = 20;

export type CartInput = { productId: string; qty: number }[];

export type PricedCart = {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

/**
 * Recomputes the cart from the server-side catalog. Client-supplied prices
 * are never trusted, which is what makes the payment amount safe.
 */
export async function priceCart(input: CartInput): Promise<PricedCart> {
  const products = await getProducts();
  const merged = new Map<string, number>();
  for (const line of input) {
    const qty = Math.floor(line.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const next = (merged.get(line.productId) || 0) + qty;
    merged.set(line.productId, Math.min(next, MAX_QTY_PER_ITEM));
  }

  const items: OrderItem[] = [];
  for (const [productId, qty] of merged) {
    const product = products.find((p) => p.id === productId);
    if (!product || !isAvailable(product)) continue;
    // A tracked quantity never lets the order exceed what is left.
    const limit =
      product.stock === null || product.stock === undefined
        ? MAX_QTY_PER_ITEM
        : Math.min(MAX_QTY_PER_ITEM, product.stock);
    const capped = Math.min(qty, limit);
    if (capped <= 0) continue;
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: capped,
      lineTotal: product.price * capped,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { items, subtotal, shipping, total: subtotal + shipping };
}
