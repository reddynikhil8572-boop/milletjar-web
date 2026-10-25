"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Product } from "@/lib/types";

export type CartLine = { productId: string; qty: number };

export type CartItem = {
  product: Product;
  qty: number;
  lineTotal: number;
};

type CartContextValue = {
  lines: CartLine[];
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  ready: boolean;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "mj_cart_v1";
const CHANGE_EVENT = "mj-cart-change";
const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 49;
const MAX_QTY = 20;

const CartContext = createContext<CartContextValue | null>(null);

function sanitize(input: unknown, catalog: Product[]): CartLine[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<string, number>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const { productId, qty } = raw as Partial<CartLine>;
    if (typeof productId !== "string") continue;
    if (!catalog.some((p) => p.id === productId)) continue;
    const value = Math.floor(Number(qty));
    if (!Number.isFinite(value) || value <= 0) continue;
    merged.set(productId, Math.min((merged.get(productId) || 0) + value, MAX_QTY));
  }
  return [...merged].map(([productId, qty]) => ({ productId, qty }));
}

/**
 * localStorage is an external store, so the cart is read through
 * useSyncExternalStore instead of an effect. That keeps hydration clean and
 * avoids a cascading render on mount.
 */
const EMPTY: CartLine[] = [];
let snapshot: CartLine[] = EMPTY;
let snapshotRaw: string | null | undefined;
let snapshotCatalog: Product[] | null = null;

function readSnapshot(catalog: Product[]): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === snapshotRaw && catalog === snapshotCatalog) return snapshot;
  snapshotRaw = raw;
  snapshotCatalog = catalog;
  try {
    snapshot = raw ? sanitize(JSON.parse(raw), catalog) : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

function writeSnapshot(lines: CartLine[]): void {
  const raw = JSON.stringify(lines);
  snapshot = lines;
  snapshotRaw = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* storage may be unavailable in private mode */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeHydration(): () => void {
  return () => {};
}

export function CartProvider({
  products,
  children,
}: {
  /** Live catalog from the server layout; drives names, prices and badges. */
  products: Product[];
  children: React.ReactNode;
}) {
  const lines = useSyncExternalStore(
    subscribe,
    () => readSnapshot(products),
    () => EMPTY
  );
  // Server snapshot is false, client snapshot is true: flips after hydration.
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );

  const add = useCallback((productId: string, qty = 1) => {
    const current = readSnapshot(products);
    const existing = current.find((line) => line.productId === productId);
    const next = existing
      ? current.map((line) =>
          line.productId === productId
            ? { ...line, qty: Math.min(line.qty + qty, MAX_QTY) }
            : line
        )
      : [...current, { productId, qty: Math.min(Math.max(qty, 1), MAX_QTY) }];
    writeSnapshot(next);
  }, [products]);

  const setQty = useCallback((productId: string, qty: number) => {
    const current = readSnapshot(products);
    const next =
      qty <= 0
        ? current.filter((line) => line.productId !== productId)      : current.map((line) =>
          line.productId === productId
            ? { ...line, qty: Math.min(Math.floor(qty), MAX_QTY) }
            : line
        );
    writeSnapshot(next);
  }, [products]);

  const remove = useCallback((productId: string) => {
    writeSnapshot(
      readSnapshot(products).filter((line) => line.productId !== productId)
    );
  }, [products]);

  const clear = useCallback(() => writeSnapshot(EMPTY), []);

  const value = useMemo<CartContextValue>(() => {
    const items: CartItem[] = [];
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      items.push({
        product,
        qty: line.qty,
        lineTotal: product.price * line.qty,
      });
    }
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping =
      subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return {
      lines,
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      ready,
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, products, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
