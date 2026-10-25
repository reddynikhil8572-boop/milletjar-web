import { readTable, writeDB } from "./store";
import { CATALOG_SEEDED_KEY, seedProducts } from "./seed";
import type { Product } from "./types";

export type { Product };

/** At or below this tracked quantity a product is flagged as running low. */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Whether the customer can buy it right now: the admin's stock toggle must be
 * on, and a tracked quantity (when set) must be above zero.
 */
export function isAvailable(product: Product): boolean {
  return product.inStock && (product.stock ?? 1) > 0;
}

/**
 * Live catalog. Read from the store on every call — Supabase in production,
 * `.data/db.json` in development — so admin edits show up immediately.
 *
 * The first read of a fresh store writes the original six products once;
 * after that an empty catalog is an intentional state (admin deleted all).
 */
export async function getProducts(): Promise<Product[]> {
  const products = await readTable("products");
  if (products.length > 0) return products;

  const settings = await readTable("settings");
  if (settings.some((row) => row.key === CATALOG_SEEDED_KEY)) return [];

  await writeDB((db) => {
    const seeded = db.settings.some((row) => row.key === CATALOG_SEEDED_KEY);
    if (db.products.length === 0 && !seeded) {
      db.products = seedProducts();
      db.settings.push({ key: CATALOG_SEEDED_KEY, value: true });
    }
  });
  return readTable("products");
}
