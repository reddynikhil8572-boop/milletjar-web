import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { env, supabaseConfigured } from "@/lib/env";
import { guardAdmin, jsonError } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Receives an image from the admin form and writes it straight to the public
 * Supabase Storage bucket, returning the URL to store on the product.
 * Writes use the service-role key, so no storage policies are needed.
 */
export async function POST(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:products:image",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;

  if (!supabaseConfigured()) {
    return jsonError(503, "Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "Expected multipart form data");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return jsonError(400, "No file uploaded");

  const extension = EXTENSIONS[file.type];
  if (!extension) return jsonError(400, "Use a JPEG, PNG, WebP, AVIF or GIF image");
  if (file.size > MAX_BYTES) return jsonError(400, "Image must be 2 MB or smaller");

  const objectPath = `products/${Date.now()}-${randomToken(8)}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const res = await fetch(
      `${env.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: bytes,
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "[admin/products/image] storage rejected the upload:",
        res.status,
        detail.slice(0, 300)
      );
      return jsonError(
        502,
        "Upload failed. The product-images bucket may be missing — run supabase/schema.sql."
      );
    }
  } catch (err) {
    console.error("[admin/products/image] upload error:", err);
    return jsonError(502, "Upload failed. Please try again.");
  }

  const url = `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  return NextResponse.json({ ok: true, url }, { status: 201 });
}
