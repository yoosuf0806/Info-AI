import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client bound to the request's auth cookies (officer session).
// Runs under the authenticated/anon role → RLS applies.
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<any, "public", any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware
            // refreshes the session cookie on navigation.
          }
        },
      },
    },
  );
}
