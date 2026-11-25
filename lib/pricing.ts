import "server-only";

import { isAvailable } from "./products";
import type { DB, OrderItem } from "./types";

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

/** A cart that cannot be fulfilled as submitted. The caller maps this to 409. */
export class CartError extends Error {
  constructor(public problems: string[] = []) {
    super(
      problems.length > 0
        ? problems[0]
        : "Some items are no longer available in the requested quantity"
    );
    this.name = "CartError";
  }
}

/**
 * Recomputes the cart from the current catalog snapshot and reserves stock in
 * the same snapshot. Call this inside writeDB() so pricing, the stock check
 * and the decrement commit together.
 */
export function priceAndReserveCart(db: DB, input: CartInput): PricedCart {
  const merged = new Map<string, number>();
  for (const line of input) {
    const qty = Math.floor(line.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const next = (merged.get(line.productId) || 0) + qty;
    merged.set(line.productId, Math.min(next, MAX_QTY_PER_ITEM));
  }

  const problems: string[] = [];
  const items: OrderItem[] = [];
  const now = Date.now();

  for (const [productId, qty] of merged) {
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      problems.push("One of the selected products is no longer available.");
      continue;
    }
    if (!isAvailable(product)) {
      problems.push(`${product.name} is currently out of stock.`);
      continue;
    }

    const tracked = product.stock !== null && product.stock !== undefined;
    const available = tracked ? Math.max(0, product.stock as number) : MAX_QTY_PER_ITEM;
    if (qty > available) {
      problems.push(`${product.name}: only ${available} left in stock.`);
      continue;
    }

    if (tracked) {
      product.stock = (product.stock as number) - qty;
      if (product.stock === 0) product.inStock = false;
      product.updatedAt = now;
    }

    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      lineTotal: product.price * qty,
    });
  }

  if (problems.length > 0) throw new CartError(problems.slice(0, 5));
  if (items.length === 0) throw new CartError(["No valid products selected."]);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  return { items, subtotal, shipping, total: subtotal + shipping };
}
