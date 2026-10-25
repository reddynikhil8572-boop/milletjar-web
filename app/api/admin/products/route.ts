import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { guardAdmin, jsonError } from "@/lib/guard";
import { productSchema } from "@/lib/product-schema";
import { readTable, writeDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:products:list",
    csrf: false,
    limit: 120,
  });
  if (!guard.ok) return guard.response;

  const products = await readTable("products");
  return NextResponse.json({ products }, { status: 200 });
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:products:create",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message || "Invalid product");
  }
  const input = parsed.data;

  try {
    const now = Date.now();
    const created = await writeDB((db) => {
      if (db.products.some((p) => p.slug === input.slug)) return null;
      const product = {
        id: `mj_${randomToken(10)}`,
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        image: input.image,
        category: input.category,
        labels: input.labels,
        inStock: input.inStock,
        stock: input.stock,
        createdAt: now,
        updatedAt: now,
      };
      db.products.push(product);
      db.audit.push({
        id: `aud_${randomToken(8)}`,
        actor: "admin",
        actorId: guard.email,
        action: "product.create",
        target: product.id,
        createdAt: now,
      });
      return product;
    });

    if (!created) return jsonError(409, "A product with that slug already exists");

    // The store tolerates a missing `products` table so the storefront keeps
    // serving the seed catalog; that same tolerance would turn a create into
    // a silent no-op, so confirm the row actually landed.
    const saved = await readTable("products");
    const landed = saved.find((p) => p.id === created.id);
    if (!landed || (input.stock !== null && landed.stock !== input.stock)) {
      return jsonError(
        500,
        "Catalog table missing: run supabase/schema.sql in the Supabase SQL Editor, then retry."
      );
    }
    return NextResponse.json({ ok: true, product: created }, { status: 201 });
  } catch {
    return jsonError(500, "Could not save the product. Is supabase/schema.sql up to date?");
  }
}
