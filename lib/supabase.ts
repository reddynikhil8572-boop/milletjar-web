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
      // Pin the service-role Authorization header. supabase-js normally swaps
      // in the access token of any session that lives on this client, which
      // would demote every query to the signed-in user - and with RLS enabled
      // and no policies, such a user sees no rows and cannot insert.
      global: {
        headers: { Authorization: `Bearer ${env.supabaseServiceRoleKey}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
