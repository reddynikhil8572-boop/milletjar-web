import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { env, supabaseConfigured } from "@/lib/env";
import { guardAdmin, jsonError } from "@/lib/guard";
import { DATA_DIR } from "@/lib/store";

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

function hasValidImageSignature(bytes: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    case "image/avif": {
      if (bytes.toString("ascii", 4, 8) !== "ftyp") return false;
      for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
        const brand = bytes.toString("ascii", offset, offset + 4);
        if (brand === "avif" || brand === "avis") return true;
      }
      return false;
    }
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6));
    default:
      return false;
  }
}

/**
 * Receives an image from the admin form and stores it in Supabase Storage or
 * the local data directory, returning the URL to store on the product.
 */
export async function POST(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:products:image",
    csrf: true,
    limit: 30,
  });
  if (!guard.ok) return guard.response;

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

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) {
    return jsonError(400, "The uploaded file does not match its image type");
  }

  const filename = `${Date.now()}-${randomToken(8)}.${extension}`;
  if (!supabaseConfigured()) {
    try {
      const localImageDir = path.join(DATA_DIR, "product-images");
      await fs.mkdir(localImageDir, { recursive: true });
      await fs.writeFile(path.join(localImageDir, filename), bytes, { flag: "wx" });
    } catch (err) {
      console.error("[admin/products/image] local storage error:", err);
      return jsonError(500, "Could not save the image. Check the local data directory.");
    }
    return NextResponse.json(
      { ok: true, url: `/api/product-images/${filename}` },
      { status: 201 }
    );
  }

  const objectPath = `products/${filename}`;

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
