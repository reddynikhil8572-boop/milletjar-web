#!/usr/bin/env node
/**
 * One-shot data migration: local .data/db.json → Supabase.
 *
 * Usage:
 *   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. Run supabase/schema.sql in the Supabase SQL Editor
 *   3. npm run migrate:supabase
 *
 * WARNING: replaces the remote rows with the local file's contents
 * (mj_apply_snapshot deletes rows not present in the snapshot).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local reader (plain node does not load it automatically).
function loadEnvFile() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (key in process.env) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first."
  );
  process.exit(1);
}

const dataFile = path.join(
  process.env.DATA_DIR || path.join(process.cwd(), ".data"),
  "db.json"
);
if (!fs.existsSync(dataFile)) {
  console.error(`No local store found at ${dataFile}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const snapshot = {
  users: [],
  sessions: [],
  adminSessions: [],
  oauthStates: [],
  orders: [],
  audit: [],
  savedAddresses: [],
  products: [],
  settings: [],
  ...parsed,
};

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await sb.rpc("mj_apply_snapshot", { data: snapshot });
if (error) {
  console.error("Migration failed:", error.message);
  console.error("Did you run supabase/schema.sql in the SQL Editor first?");
  process.exit(1);
}

console.log("Migrated to Supabase:");
console.log(`  users:           ${snapshot.users.length}`);
console.log(`  orders:          ${snapshot.orders.length}`);
console.log(`  sessions:        ${snapshot.sessions.length}`);
console.log(`  saved addresses: ${snapshot.savedAddresses.length}`);
console.log(`  products:        ${snapshot.products.length}`);
console.log(`  settings:        ${snapshot.settings.length}`);
console.log(
  "Note: remote tables now mirror this file exactly (rows not in the file were removed)."
);
