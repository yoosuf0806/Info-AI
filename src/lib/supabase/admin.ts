import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. BYPASSES RLS — server-side only, never import into a
// client component. Used for RAG retrieval and officer write paths (after the
// caller's officer session has been verified).
//
// Typed with a permissive schema generic: this project doesn't ship generated
// database types, so `any` keeps insert/update/rpc calls ergonomic. Runtime
// validation happens in the route handlers.
let cached: SupabaseClient<any, "public", any> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<any, "public", any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createClient<any, "public", any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
