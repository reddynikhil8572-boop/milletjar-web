#!/usr/bin/env node
/**
 * Next.js `output: "standalone"` does not copy `public` or `.next/static`
 * into the standalone bundle. This runs after `next build` so that
 * `node .next/standalone/server.js` works on Render, Railway and Docker.
 */
import fs from "node:fs/promises";

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

await copy("public", ".next/standalone/public");
await copy(".next/static", ".next/standalone/.next/static");
