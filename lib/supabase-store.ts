import { supabaseAdmin } from "./supabase";
import { seedProducts } from "./seed";
import type { AdminSession, AuditEvent, DB, OAuthState, Order, Product, SavedAddress, Setting, User, UserSession } from "./types";

/**
 * Supabase (Postgres over the HTTP data API) implementation of the store
 * interface. Mirrors the file store's semantics:
 *
 * - readDB:  load a full snapshot, run the callback (read-only).
 * - writeDB: serialized; load a fresh snapshot, let the callback mutate it,
 *            then persist the whole snapshot with one atomic RPC
 *            (`mj_apply_snapshot` upserts every row and deletes rows that
 *            are no longer in the snapshot, in a single transaction).
 *
 * Column names are camelCase so rows map 1:1 onto the TypeScript types.
 */

async function all<T>(table: string): Promise<T[]> {
  const { data, error } = await supabaseAdmin().from(table).select("*");
  if (error) {
    // Not migrated yet: supabase/schema.sql has not created this table (or
    // replaced mj_apply_snapshot). Serve sane defaults instead of taking the
    // whole site down; the storefront falls back to the seed catalog.
    if (isMissingTable(error)) {
      const fallback = TABLE_FALLBACKS[table];
      if (fallback) return [...fallback] as T[];
    }
    throw new Error(`supabase:${table}: ${error.message}`);
  }
  return (data ?? []) as T[];
}

/** Postgres 42P01, or PostgREST PGRST205 ("not in the schema cache"). */
function isMissingTable(error: { code?: string; message: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table")
  );
}

/** Only for tables created after the initial schema; see all() above. */
const TABLE_FALLBACKS: Record<string, unknown[]> = {
  products: seedProducts() as Product[],
  settings: [] as Setting[],
};

export async function readTable<K extends keyof DB>(table: K): Promise<DB[K]> {
  const rows = await all<DB[K][number]>(table as string);
  return rows as DB[K];
}

export async function loadSnapshot(): Promise<DB> {
  const [users, sessions, adminSessions, oauthStates, orders, audit, savedAddresses, products, settings] =
    await Promise.all([
      all<User>("users"),
      all<UserSession>("user_sessions"),
      all<AdminSession>("admin_sessions"),
      all<OAuthState>("oauth_states"),
      all<Order>("orders"),
      all<AuditEvent>("audit"),
      all<SavedAddress>("saved_addresses"),
      all<Product>("products"),
      all<Setting>("settings"),
    ]);
  return { users, sessions, adminSessions, oauthStates, orders, audit, savedAddresses, products, settings };
}

async function persist(db: DB): Promise<void> {
  const { error } = await supabaseAdmin().rpc("mj_apply_snapshot", { data: db });
  if (error) throw new Error(`supabase:mj_apply_snapshot: ${error.message}`);
}

export async function readDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await loadSnapshot();
  return fn(db);
}

let queue: Promise<unknown> = Promise.resolve();

export async function writeDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await loadSnapshot();
    const result = await fn(db);
    await persist(db);
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
