import { NextResponse } from "next/server";
import { withOfficer } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexProcedure } from "@/lib/rag/index-procedure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Embedding many procedures can take a while.
export const maxDuration = 300;

// Re-embed all published procedures. Use after seeding, or after changing the
// embedding model/dimension. Officer-only.
export const POST = withOfficer(async () => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("procedures")
    .select("id")
    .eq("status", "published");
  if (error) throw new Error(error.message);

  const ids = (data as Array<{ id: string }>).map((r) => r.id);
  const results: Array<{ id: string; chunks: number; error?: string }> = [];
  for (const id of ids) {
    try {
      const { chunks } = await indexProcedure(id);
      results.push({ id, chunks });
    } catch (e) {
      results.push({
        id,
        chunks: 0,
        error: e instanceof Error ? e.message : "failed",
      });
    }
  }
  return NextResponse.json({ reindexed: results.length, results });
});
