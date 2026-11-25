import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/client-ip";

// Coarse per-IP limiter for the edge. Route handlers enforce their own,
// stricter limits (lib/guard.ts uses the shared Postgres limiter in prod).
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX = 120;
let lastSweep = 0;

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = ["'self'", `'nonce-${nonce}'`].join(" ");

  return [
    "default-src 'self'",
    `script-src ${script}`,
    `style-src ${style}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://wa.me https://api.whatsapp.com",
    "object-src 'none'",
  ].join("; ");
}

function applySecurityHeaders(res: NextResponse, nonce: string): void {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  res.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
}

export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(res, nonce);

  if (req.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set("Cache-Control", "no-store, max-age=0");
    res.headers.set("X-Robots-Tag", "noindex");

    const ip = clientIp(req);
    const now = Date.now();
    if (now - lastSweep > WINDOW_MS) {
      lastSweep = now;
      for (const [key, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(key);
      }
    }

    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > MAX) {
        const blocked = new NextResponse(
          JSON.stringify({ error: "Too many requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
            },
          }
        );
        applySecurityHeaders(blocked, nonce);
        blocked.headers.set("Cache-Control", "no-store, max-age=0");
        blocked.headers.set("X-Robots-Tag", "noindex");
        return blocked;
      }
    }
  }

  if (req.nextUrl.pathname.startsWith("/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
