import { NextResponse } from "next/server";
import { requireOfficer, UnauthorizedError } from "./supabase/auth";

// Wraps an officer-only handler: verifies the session, maps errors to JSON.
export function withOfficer<T extends unknown[]>(
  handler: (userId: string, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const user = await requireOfficer();
      return await handler(user.id, ...args);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      console.error("[admin api] error:", err);
      const message = err instanceof Error ? err.message : "Server error.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body.");
  }
}
