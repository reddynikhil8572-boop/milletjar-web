import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { siteOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

/** Public pages only. Carts, accounts, orders and admin areas are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  const lastModified = new Date();
  const products = await getProducts();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/products`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/refund`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...products.map((product) => ({
      url: `${base}/products/${encodeURIComponent(product.slug)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
