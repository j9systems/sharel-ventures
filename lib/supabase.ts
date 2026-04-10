import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }

    // Server actions run as "use server" — use the service role key to
    // bypass RLS. Falls back to anon key if the service role key is not set.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = serviceRoleKey || supabaseAnonKey;

    _supabase = createClient(supabaseUrl, key);
  }
  return _supabase;
}

// Re-export as `supabase` getter for convenience
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
