import { readTable, writeDB } from "./store";
import { CATALOG_SEEDED_KEY, seedProducts } from "./seed";
import type { Product } from "./types";

export type { Product };

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
