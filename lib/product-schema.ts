import { z } from "zod";

/** Body validation for POST (create) — PATCH uses the same fields, all optional. */
export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().trim().max(500).default(""),
  /** Selling price in INR. */
  price: z.number().int().min(1).max(1_000_000),
  /** MRP shown struck through. Null clears the discount. */
  compareAtPrice: z.number().int().min(1).max(1_000_000).nullable().default(null),
  /**
   * Public image URL (Supabase Storage) or a path under /public. Restricted
   * to those two forms so next/image's remotePatterns always match and a
   * pasted URL can never break the storefront render.
   */
  image: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .refine(
      (value) =>
        value.startsWith("/") || value.includes("/storage/v1/object/public/"),
      "Upload an image, or use a path under /images"
    ),
  category: z.enum(["millet", "mix", "snack"]),
  labels: z.array(z.string().trim().min(1).max(30)).max(6).default([]),
  inStock: z.boolean().default(true),
  /** Remaining units; null = quantity not tracked (always available). */
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
});

export const productPatchSchema = productSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Nothing to update"
  );

export type ProductInput = z.infer<typeof productSchema>;
