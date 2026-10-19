import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexProcedure } from "@/lib/rag/index-procedure";
import { isLanguage } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List procedures (officers see drafts + published). Optional ?category=&status=
export const GET = withOfficer(async (_userId, req: Request) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");

  const admin = createSupabaseAdminClient();
  let q = admin
    .from("procedures")
    .select(
      "id, category_id, title, source_department, status, authoring_language, last_verified_date, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (category) q = q.eq("category_id", category);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return NextResponse.json({ procedures: data });
});

interface ProcedureInput {
  category_id?: string | null;
  title?: string;
  body?: string;
  source_department?: string;
  fees?: string | null;
  timeline?: string | null;
  authoring_language?: string;
  last_verified_date?: string | null;
  status?: "draft" | "published";
}

// Create a procedure. If created as published, embed immediately.
export const POST = withOfficer(async (userId, req: Request) => {
  const b = await readJson<ProcedureInput>(req);
  if (!b.title || !b.title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  const status = b.status === "published" ? "published" : "draft";
  const lang = isLanguage(b.authoring_language) ? b.authoring_language : "en";

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("procedures")
    .insert({
      category_id: b.category_id ?? null,
      title: b.title.trim(),
      body: b.body ?? "",
      source_department: b.source_department ?? "",
      fees: b.fees ?? null,
      timeline: b.timeline ?? null,
      authoring_language: lang,
      last_verified_date: b.last_verified_date || null,
      status,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const procedure = data as { id: string };
  if (status === "published") {
    await indexProcedure(procedure.id);
  }
  return NextResponse.json({ procedure: data }, { status: 201 });
});
