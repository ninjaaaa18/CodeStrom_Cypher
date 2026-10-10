import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Lazily create and cache a singleton browser client. Uses only the public
// project URL and anon/publishable key from VITE_ environment variables;
// credentials are never hardcoded. Throwing here (only when the client is
// actually requested) keeps a missing configuration from crashing unrelated
// code, such as the existing SQLite-backed dashboard, at import time.
let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
    // Reference only the variable names, never their values, so no credential is exposed.
    throw new Error(
      `Supabase is not configured. Set ${missing.join(" and ")} in your environment (see .env.example). ` +
        "Only the public project URL and anon/publishable key belong in the browser."
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });

  return cachedClient;
}
