import "server-only";

const isProd = process.env.NODE_ENV === "production";
const DEV_WHATSAPP_NUMBER = "919999999999";

/**
 * Server-only environment access. Never import this from a client component.
 */
export const env = {
  isProd,
  authSecret: process.env.AUTH_SECRET || "",
  adminSecret: process.env.ADMIN_AUTH_SECRET || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  whatsappNumberRaw: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

let warned = false;

/** User session signing secret. Fails closed in production. */
export function userSecret(): string {
  if (env.authSecret) return env.authSecret;
  if (isProd) {
    throw new Error("AUTH_SECRET is required in production");
  }
  if (!warned) {
    warned = true;
    console.warn(
      "[milletjar] AUTH_SECRET is not set - using an insecure development secret."
    );
  }
  return "dev-only-insecure-secret";
}

/** Admin session signing secret. Deliberately separate from the user secret. */
export function adminSecret(): string {
  if (env.adminSecret) return env.adminSecret;
  if (isProd) {
    throw new Error("ADMIN_AUTH_SECRET is required in production");
  }
  return "dev-only-insecure-admin-secret";
}

export function googleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

/**
 * Supabase (Postgres via the HTTP data API) is used when URL + service key
 * are set; otherwise the local file store keeps working for development.
 */
export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

/** Digits only, with a real number required in production. */
export function normalizedWhatsappNumber(): string | null {
  const digits = env.whatsappNumberRaw.trim().replace(/[\s()+.-]/g, "");
  if (!/^\d{10,15}$/.test(digits)) return null;
  if (digits === DEV_WHATSAPP_NUMBER) return null;
  return digits;
}

/** The single server-side WhatsApp destination for order links. */
export function whatsappNumber(): string {
  const digits = normalizedWhatsappNumber();
  if (digits) return digits;
  if (isProd) {
    throw new Error(
      "NEXT_PUBLIC_WHATSAPP_NUMBER must be a real 10-15 digit number; the placeholder is not allowed in production"
    );
  }
  if (!warned) {
    warned = true;
    console.warn(
      "[milletjar] WhatsApp number is missing or still the placeholder - using a dev-only fallback."
    );
  }
  return DEV_WHATSAPP_NUMBER;
}

/**
 * Called from instrumentation.ts on server start. Fail fast in production so
 * a deploy never serves broken OAuth links or wa.me links.
 */
export function validateProductionConfig(): void {
  if (!isProd) return;

  const problems: string[] = [];
  const appUrl = process.env.APP_URL || "";
  try {
    const url = new URL(appUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      problems.push("APP_URL must use http or https");
    }
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|example\.(com|org|net))$/i.test(url.hostname)) {
      problems.push("APP_URL must be the real public origin, not a placeholder");
    }
    if (url.username || url.password) {
      problems.push("APP_URL must not contain credentials");
    }
  } catch {
    problems.push("APP_URL must be a valid absolute URL, e.g. https://www.milletjar.in");
  }

  if (!normalizedWhatsappNumber()) {
    problems.push(
      "NEXT_PUBLIC_WHATSAPP_NUMBER must be a real 10-15 digit number (the sample 919999999999 is rejected)"
    );
  }
  if (env.authSecret.length < 32) {
    problems.push("AUTH_SECRET must be at least 32 characters");
  }
  if (env.adminSecret.length < 32) {
    problems.push("ADMIN_AUTH_SECRET must be at least 32 characters");
  }
  if (env.authSecret && env.authSecret === env.adminSecret) {
    problems.push("AUTH_SECRET and ADMIN_AUTH_SECRET must be different values");
  }

  if (!supabaseConfigured()) {
    problems.push("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production");
  } else {
    try {
      const url = new URL(env.supabaseUrl);
      if (!url.hostname.endsWith(".supabase.co")) {
        problems.push("SUPABASE_URL must be a Supabase project URL");
      }
    } catch {
      problems.push("SUPABASE_URL must be a valid absolute URL");
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `[milletjar] production configuration is invalid:\n- ${problems.join("\n- ")}`
    );
  }
}
