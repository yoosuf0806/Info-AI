import { createSupabaseServerClient } from "./server";

// Returns the signed-in officer (auth user) or null. Officer-only routes call
// this and reject when null. Any authenticated user is an officer (flat role).
export async function getOfficer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Guard for API routes: throws a Response-friendly sentinel when unauthorized.
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireOfficer() {
  const user = await getOfficer();
  if (!user) throw new UnauthorizedError();
  return user;
}
