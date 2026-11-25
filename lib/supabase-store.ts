import "server-only";

import { supabaseAdmin } from "./supabase";
import { seedProducts } from "./seed";
import type {
  AdminSession,
  AuditEvent,
  DB,
  OAuthState,
  Order,
  Product,
  SavedAddress,
  Setting,
  User,
  UserSession,
} from "./types";

/**
 * Supabase (Postgres over the HTTP data API) implementation of the store
 * interface.
 *
 * - readDB:  load a full snapshot, run the callback (read-only).
 * - writeDB: load a fresh snapshot plus its version, let the callback mutate
 *            it, then persist with compare-and-swap. If another writer won the
 *            race, reload and retry the callback on the newer snapshot.
 *
 * The CAS version is what stops a stale snapshot from deleting rows another
 * request just created. Column names are camelCase so rows map 1:1 onto the
 * TypeScript types.
 */

class VersionConflictError extends Error {
  constructor() {
    super("supabase: snapshot version conflict");
    this.name = "VersionConflictError";
  }
}

const MAX_WRITE_ATTEMPTS = 6;

async function all<T>(table: string): Promise<T[]> {
  const { data, error } = await supabaseAdmin().from(table).select("*");
  if (error) {
    // Not migrated yet: supabase/schema.sql has not created this table (or
    // replaced mj_apply_snapshot). Serve sane defaults instead of taking the
    // whole site down; the storefront falls back to the seed catalog.
    if (isMissingTable(error)) {
      const fallback = TABLE_FALLBACKS[table];
      // Deep copy: callers mutate rows (e.g. an admin PATCH), and sharing one
      // instance would let edits bleed across requests — and make it look like
      // a write persisted when it never reached the database.
      if (fallback) return structuredClone(fallback) as T[];
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

async function loadVersion(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("db_meta")
    .select("version")
    .eq("id", "single")
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return 0;
    throw new Error(`supabase:db_meta: ${error.message}`);
  }
  return Number(data?.version ?? 0);
}

async function loadSnapshotWithVersion(): Promise<{ db: DB; version: number }> {
  const [
    users,
    sessions,
    adminSessions,
    oauthStates,
    orders,
    audit,
    savedAddresses,
    products,
    settings,
    version,
  ] = await Promise.all([
    all<User>("users"),
    all<UserSession>("user_sessions"),
    all<AdminSession>("admin_sessions"),
    all<OAuthState>("oauth_states"),
    all<Order>("orders"),
    all<AuditEvent>("audit"),
    all<SavedAddress>("saved_addresses"),
    all<Product>("products"),
    all<Setting>("settings"),
    loadVersion(),
  ]);
  return {
    db: {
      users,
      sessions,
      adminSessions,
      oauthStates,
      orders,
      audit,
      savedAddresses,
      products,
      settings,
    },
    version,
  };
}

export async function loadSnapshot(): Promise<DB> {
  return (await loadSnapshotWithVersion()).db;
}

async function persist(db: DB, expectedVersion: number): Promise<void> {
  const { error } = await supabaseAdmin().rpc("mj_apply_snapshot", {
    data: db,
    expected_version: expectedVersion,
  });
  if (error) {
    if (error.code === "40001" || error.message.includes("version conflict")) {
      throw new VersionConflictError();
    }
    if (
      error.message.includes("Could not find the function") &&
      (await persistLegacy(db))
    ) {
      return;
    }
    throw new Error(
      `supabase:mj_apply_snapshot: ${error.message}. Run supabase/schema.sql to upgrade the RPC.`
    );
  }
}

export async function readDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await loadSnapshot();
  return fn(db);
}

let warnedLegacyRpc = false;

/** Temporary compatibility with databases that have not re-run schema.sql. */
async function persistLegacy(db: DB): Promise<boolean> {
  const { error } = await supabaseAdmin().rpc("mj_apply_snapshot", { data: db });
  if (error) return false;
  if (!warnedLegacyRpc) {
    warnedLegacyRpc = true;
    console.warn(
      "[milletjar] database uses the legacy snapshot RPC; re-run supabase/schema.sql to enable CAS writes and shared rate limits"
    );
  }
  return true;
}

let queue: Promise<unknown> = Promise.resolve();

export async function writeDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
      const { db, version } = await loadSnapshotWithVersion();
      const result = await fn(db);
      try {
        await persist(db, version);
        return result;
      } catch (err) {
        if (err instanceof VersionConflictError && attempt < MAX_WRITE_ATTEMPTS) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("supabase:writeDB gave up after too many concurrent updates");
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
