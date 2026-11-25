import "server-only";

import { env, supabaseConfigured } from "./env";
import { supabaseAdmin } from "./supabase";

export { clientIp } from "./client-ip";

type Bucket = { count: number; resetAt: number };
type LimitResult = { allowed: boolean; retryAfter: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;
let warnedRpc = false;

/**
 * Shared fixed-window limiter. In production with Supabase configured, the
 * atomic mj_rate_limit() RPC enforces limits across instances. The local map
 * is a fallback for development and for a transient RPC failure.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<LimitResult> {
  maybeSweep();

  if (env.isProd && supabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin().rpc("mj_rate_limit", {
        p_key: key.slice(0, 200),
        p_limit: limit,
        p_window_ms: windowMs,
      });
      if (!error && data && typeof data === "object") {
        const row = data as { allowed?: boolean; retryAfter?: number };
        return {
          allowed: row.allowed !== false,
          retryAfter: Math.max(0, Number(row.retryAfter) || 0),
        };
      }
      if (error && !warnedRpc) {
        warnedRpc = true;
        console.warn(
          `[milletjar] rate-limit RPC unavailable, using local limiter: ${error.message}`
        );
      }
    } catch (err) {
      if (!warnedRpc) {
        warnedRpc = true;
        console.warn("[milletjar] rate-limit RPC failed, using local limiter", err);
      }
    }
  }

  return localRateLimit(key, limit, windowMs);
}

function localRateLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfter: 0 };
}

function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  sweepRateLimits();
}

/** Periodic cleanup so the fallback map cannot grow without bound. */
export function sweepRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
