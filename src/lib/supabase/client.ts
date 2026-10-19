"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client (anon key). Used by the officer login form and admin UI to
// establish/read the auth session. RLS always applies here.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
