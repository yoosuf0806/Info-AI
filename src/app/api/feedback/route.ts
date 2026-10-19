import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: attach an anonymous thumbs-up/down to a logged query.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { queryId, feedback } = (body ?? {}) as {
    queryId?: unknown;
    feedback?: unknown;
  };

  if (typeof queryId !== "string" || !queryId) {
    return NextResponse.json({ error: "queryId is required." }, { status: 400 });
  }
  if (feedback !== "up" && feedback !== "down") {
    return NextResponse.json(
      { error: "feedback must be 'up' or 'down'." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("queries")
    .update({ feedback })
    .eq("id", queryId);

  if (error) {
    return NextResponse.json(
      { error: "Could not record feedback." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
