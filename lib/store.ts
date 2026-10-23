import fs from "node:fs/promises";
import path from "node:path";
import type { DB } from "./types";

/**
 * Minimal JSON persistence layer.
 *
 * Chosen deliberately: zero native dependencies so the same code runs on
 * Windows dev boxes, Render and Railway. Swap `readDB`/`writeDB` for a real
 * database client (Postgres/Redis) when you outgrow a single instance.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDB(): DB {
  return {
    users: [],
    sessions: [],
    adminSessions: [],
    oauthStates: [],
    orders: [],
    audit: [],
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

/** Read-only access. Do not mutate the passed object. */
export async function readDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await load();
  return fn(db);
}

/** Serialized read-modify-write. Mutations are persisted atomically. */
export async function writeDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
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
