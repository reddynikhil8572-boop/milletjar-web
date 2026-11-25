import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/booking",
        "/cart",
        "/login",
        "/order/",
        "/api/",
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
