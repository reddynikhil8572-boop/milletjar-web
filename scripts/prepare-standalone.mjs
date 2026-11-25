#!/usr/bin/env node
/**
 * Next.js `output: "standalone"` does not copy `public` or `.next/static`
 * into the standalone bundle. This runs after `next build` so that
 * `node .next/standalone/server.js` works on Render, Railway and Docker.
 *
 * Next may also trace a local `.env` into the bundle. Secrets must never ship
 * in a deploy artifact, so every `.env*` file is removed from the output.
 */
import fs from "node:fs/promises";
import path from "node:path";

async function copy(from, to) {
  try {
    await fs.cp(from, to, { recursive: true, force: true });
    console.log(`[standalone] copied ${from} -> ${to}`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(`[standalone] skipped missing ${from}`);
      return;
    }
    throw error;
  }
}

async function stripEnvFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await stripEnvFiles(full);
    } else if (/^\.env(\.|$)/.test(entry.name)) {
      await fs.rm(full, { force: true });
      console.log(`[standalone] removed ${full}`);
    }
  }
}

await copy("public", ".next/standalone/public");
await copy(".next/static", ".next/standalone/.next/static");
await stripEnvFiles(".next/standalone");
