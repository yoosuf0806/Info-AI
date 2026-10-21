import { NextResponse } from "next/server";
import { withOfficer } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Officer: the review queue — pending candidates (with their source gazette) and
// the most recent ingested/errored gazette documents.
export const GET = withOfficer(async () => {
  const admin = createSupabaseAdminClient();

  const { data: candidates, error: candErr } = await admin
    .from("gazette_candidates")
    .select(
      "*, gazette:gazette_documents(id, source_url, title, gazette_number, published_date)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (candErr) throw new Error(candErr.message);

  const { data: documents, error: docErr } = await admin
    .from("gazette_documents")
    .select("id, source_url, title, gazette_number, published_date, status, error, char_count, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(20);
  if (docErr) throw new Error(docErr.message);

  return NextResponse.json({ candidates, documents });
});
