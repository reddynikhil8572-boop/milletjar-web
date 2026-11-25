#!/usr/bin/env node
/**
 * Provision (or repair) the admin account used by /admin/login.
 *
 * Admin sign-in authenticates against Supabase Auth (auth.users) and then
 * requires a matching row in public.users with role = 'admin'. This script:
 *
 *   1. creates the Supabase Auth user (email confirmed), or updates its
 *      password if it already exists;
 *   2. upserts the public.users row and forces role = 'admin';
 *   3. prints the credentials to sign in at /admin/login.
 *
 * Usage:
 *   npm run create:admin -- [email] [password]
 *
 * Defaults: email = ADMIN_EMAIL, password = generated (printed once).
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Minimal .env loader (plain node does not load env files automatically). */
function loadEnvFile(name) {
  const file = path.join(process.cwd(), name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (key in process.env) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, "");
  }
}

// .env.local wins over .env, mirroring Next.js.
loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or .env.local) first."
  );
  process.exit(1);
}

const email = (
  process.argv[2] ||
  process.env.ADMIN_EMAIL ||
  ""
).trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error(
    "Usage: npm run create:admin -- <email> [password]\n" +
      "       (or set ADMIN_EMAIL in the environment)"
  );
  process.exit(1);
}

const password =
  process.argv[3] || crypto.randomBytes(18).toString("base64url");
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Find an auth user by email (the admin API has no direct lookup). */
async function findAuthUser(targetEmail) {
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email || "").toLowerCase() === targetEmail
    );
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

const name = email.split("@")[0];
let authUser = await findAuthUser(email);

if (authUser) {
  const { data, error } = await sb.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(authUser.user_metadata || {}), name },
  });
  if (error) {
    console.error("Failed to update the Supabase Auth user:", error.message);
    process.exit(1);
  }
  authUser = data.user;
  console.log(`Updated Supabase Auth user ${email}`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    console.error(
      "Failed to create the Supabase Auth user:",
      error?.message || "unknown error"
    );
    process.exit(1);
  }
  authUser = data.user;
  console.log(`Created Supabase Auth user ${email}`);
}

// Ensure the app-side profile row exists and is an admin.
const { data: profile, error: profileError } = await sb
  .from("users")
  .select("id, role")
  .eq("email", email)
  .maybeSingle();

if (profileError) {
  console.error(
    "Failed to read public.users:",
    profileError.message,
    "\nDid you run supabase/schema.sql in the SQL Editor?"
  );
  process.exit(1);
}

const now = Date.now();
if (profile) {
  if (profile.role !== "admin") {
    const { error } = await sb
      .from("users")
      .update({ role: "admin" })
      .eq("id", profile.id);
    if (error) {
      console.error("Failed to grant the admin role:", error.message);
      process.exit(1);
    }
  }
  console.log(`public.users: ${email} is now role = admin`);
} else {
  const { error } = await sb.from("users").insert({
    id: authUser.id,
    email,
    name,
    picture: null,
    provider: "password",
    passwordHash: null,
    role: "admin",
    createdAt: now,
    lastLoginAt: now,
  });
  if (error) {
    console.error("Failed to create the public.users row:", error.message);
    process.exit(1);
  }
  console.log(`public.users: created ${email} with role = admin`);
}

console.log("\nAdmin sign-in credentials:");
console.log(`  URL:      /admin/login`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log(
  "\nStore the password securely and change it for production " +
    "(re-run this script with a strong password)."
);
