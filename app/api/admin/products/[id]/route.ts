import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { guardAdmin, jsonError } from "@/lib/guard";
import { productPatchSchema } from "@/lib/product-schema";
import { readTable, writeDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Catalog table missing: run supabase/schema.sql in the Supabase SQL Editor, then retry.";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(req, {
    key: "admin:products:update",
    csrf: true,
    limit: 60,
  });
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message || "Invalid update");
  }
  const patch = parsed.data;

  try {
    const result = await writeDB((db) => {
      const product = db.products.find((p) => p.id === id);
      if (!product) return { found: false } as const;

      if (patch.slug !== undefined && patch.slug !== product.slug) {
        const taken = db.products.some(
          (p) => p.id !== id && p.slug === patch.slug
        );
        if (taken) return { conflict: true } as const;
      }

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        (product as unknown as Record<string, unknown>)[key] = value;
      }
      product.updatedAt = Date.now();

      db.audit.push({
        id: `aud_${randomToken(8)}`,
        actor: "admin",
        actorId: guard.email,
        action: "product.update",
        target: product.id,
        createdAt: Date.now(),
      });
      return { found: true, conflict: false, product } as const;
    });

    if ("conflict" in result && result.conflict) {
      return jsonError(409, "A product with that slug already exists");
    }
    if (!result.found) return jsonError(404, "Product not found");

    // The store tolerates a missing `products` table so the storefront keeps
    // serving the seed catalog — without this check an update would look
    // successful in the admin panel while storing nothing.
    const saved = await readTable("products");
    const persisted = saved.find((p) => p.id === id);
    const stockMatches =
      patch.stock === undefined || patch.stock === null
        ? true
        : persisted?.stock === patch.stock;
    if (
      !persisted ||
      persisted.updatedAt !== result.product.updatedAt ||
      !stockMatches
    ) {
      return jsonError(500, MIGRATION_HINT);
    }

    return NextResponse.json(
      { ok: true, product: persisted },
      { status: 200 }
    );
  } catch {
    return jsonError(500, "Could not update the product");
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(req, {
    key: "admin:products:delete",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  try {
    const removed = await writeDB((db) => {
      const product = db.products.find((p) => p.id === id);
      if (!product) return null;
      db.products = db.products.filter((p) => p.id !== id);
      db.audit.push({
        id: `aud_${randomToken(8)}`,
        actor: "admin",
        actorId: guard.email,
        action: "product.delete",
        target: id,
        createdAt: Date.now(),
      });
      return product;
    });

    if (!removed) return jsonError(404, "Product not found");

    const saved = await readTable("products");
    if (saved.some((p) => p.id === id)) return jsonError(500, MIGRATION_HINT);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return jsonError(500, "Could not delete the product");
  }
}
