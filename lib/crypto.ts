import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Constant-time string comparison that never throws on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still burn a comparison to reduce timing signal.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  try {
    const key = await scrypt(password, salt, SCRYPT_KEYLEN);
    return safeEqual(key.toString("hex"), expected);
  } catch {
    return false;
  }
}

export function siteOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/** Reject cross-site mutations in addition to the CSRF token check. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    const allowed = new Set<string>();
    try {
      allowed.add(new URL(req.url).origin);
    } catch {
      /* ignore */
    }
    if (process.env.APP_URL) {
      try {
        allowed.add(new URL(process.env.APP_URL).origin);
      } catch {
        /* ignore */
      }
    }
    if (!allowed.has(origin)) return false;
  }
  return true;
}
