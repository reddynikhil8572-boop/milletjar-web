import fs from "node:fs/promises";
import path from "node:path";
import { supabaseConfigured } from "./env";
import type { DB } from "./types";

/**
 * Persistence layer with two backends behind one interface:
 *
 * - Supabase (Postgres over HTTPS) when SUPABASE_URL +
 *   SUPABASE_SERVICE_ROLE_KEY are set — production.
 * - A local JSON file otherwise — zero-dependency development.
 *
 * The Supabase module is imported lazily so file mode never loads it.
 */
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDB(): DB {
  return {
    users: [],
    sessions: [],
    adminSessions: [],
    oauthStates: [],
    orders: [],
    audit: [],
    savedAddresses: [],
    products: [],
    settings: [],
  };
}

let cache: DB | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<DB> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DB>;
    cache = { ...emptyDB(), ...parsed };
  } catch {
    cache = emptyDB();
  }
  return cache;
}

async function persist(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

function supabaseStore() {
  return import("./supabase-store");
}

/** Read-only access. Do not mutate the passed object. */
export async function readDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (supabaseConfigured()) {
    const store = await supabaseStore();
    return store.readDB(fn);
  }
  const db = await load();
  return fn(db);
}

/**
 * Reads a single table instead of the whole snapshot. Used on hot paths
 * (storefront pages) where only the catalog or settings are needed.
 */
export async function readTable<K extends keyof DB>(table: K): Promise<DB[K]> {
  if (supabaseConfigured()) {
    const store = await supabaseStore();
    return store.readTable(table);
  }
  const db = await load();
  return db[table];
}

/** Serialized read-modify-write. Mutations are persisted atomically. */
export async function writeDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (supabaseConfigured()) {
    const store = await supabaseStore();
    return store.writeDB(fn);
  }
  const run = async (): Promise<T> => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** Removes expired sessions/state. Called opportunistically. */
export function prune(db: DB): void {
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  db.adminSessions = db.adminSessions.filter((s) => s.expiresAt > now);
  db.oauthStates = db.oauthStates.filter((s) => now - s.createdAt < 10 * 60_000);
  if (db.audit.length > 2000) db.audit = db.audit.slice(-2000);
}
