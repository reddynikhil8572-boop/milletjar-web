import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, supabaseConfigured } from "./env";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client (service role). Talks to the Postgres data API
 * over HTTPS, so it works regardless of IPv4/IPv6 connectivity.
 * Never import this from a client component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
