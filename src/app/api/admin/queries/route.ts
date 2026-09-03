import { NextResponse } from "next/server";
import { withOfficer } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Officer view of anonymous query logs. ?filter=down surfaces 👎 answers for
// review; ?filter=unanswered surfaces "no information" misses (content gaps).
export const GET = withOfficer(async (_userId, req: Request) => {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter");

  const admin = createSupabaseAdminClient();
  let q = admin
    .from("queries")
    .select("id, question_text, language, answered, feedback, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter === "down") q = q.eq("feedback", "down");
  if (filter === "unanswered") q = q.eq("answered", false);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return NextResponse.json({ queries: data });
});
