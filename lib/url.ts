import "server-only";

import { SITE } from "./config";

/**
 * Public origin for metadata files (sitemap, robots) that have no request to
 * inspect. APP_URL wins in production; the site's canonical URL is the fallback.
 */
export function siteOrigin(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return SITE.url;
}

/**
 * Resolves the public origin of a request. Prefers an explicitly configured
 * APP_URL so OAuth redirect URIs stay stable behind proxies.
 */
export function requestOrigin(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}
