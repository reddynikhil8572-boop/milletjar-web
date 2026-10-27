import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ filename: string }> }
) {
  const { filename } = await ctx.params;
  const match = /^(\d+)-([A-Za-z0-9_-]+)\.(jpg|png|webp|avif|gif)$/.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  const contentType = CONTENT_TYPES[match[3]];
  try {
    const bytes = await fs.readFile(path.join(DATA_DIR, "product-images", filename));
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    console.error("[product-images] local image read error:", err);
    return new Response("Could not read the image", { status: 500 });
  }
}
