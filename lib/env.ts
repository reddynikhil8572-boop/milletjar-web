const isProd = process.env.NODE_ENV === "production";

/**
 * Server-only environment access. Never import this from a client component.
 */
export const env = {
  isProd,
  authSecret: process.env.AUTH_SECRET || "",
  adminSecret: process.env.ADMIN_AUTH_SECRET || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999",
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
