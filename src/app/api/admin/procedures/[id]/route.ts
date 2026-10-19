import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexProcedure } from "@/lib/rag/index-procedure";
import { isLanguage } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// Fetch a single procedure with its verified translations (for the editor).
export const GET = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("procedures")
    .select("*")
    .eq("id", ctx.params.id)
    .single();
  if (error) throw new Error(error.message);

  const { data: translations } = await admin
    .from("procedure_translations")
    .select("*")
    .eq("procedure_id", ctx.params.id);

  return NextResponse.json({ procedure: data, translations: translations ?? [] });
});

interface ProcedurePatch {
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

// Update a procedure. Re-embeds whenever the result is published (content may
// have changed) or clears chunks when moved to draft. indexProcedure handles both.
export const PATCH = withOfficer(async (_userId, req: Request, ctx: Ctx) => {
  const b = await readJson<ProcedurePatch>(req);
  const patch: Record<string, unknown> = {};
  if ("category_id" in b) patch.category_id = b.category_id ?? null;
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.body === "string") patch.body = b.body;
  if (typeof b.source_department === "string")
    patch.source_department = b.source_department;
  if ("fees" in b) patch.fees = b.fees ?? null;
  if ("timeline" in b) patch.timeline = b.timeline ?? null;
  if (isLanguage(b.authoring_language))
    patch.authoring_language = b.authoring_language;
  if ("last_verified_date" in b)
    patch.last_verified_date = b.last_verified_date || null;
  if (b.status === "draft" || b.status === "published") patch.status = b.status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No changes." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("procedures")
    .update(patch)
    .eq("id", ctx.params.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Keep the vector index in sync with the current content/status.
  await indexProcedure(ctx.params.id);

  return NextResponse.json({ procedure: data });
});

export const DELETE = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  // Chunks/translations cascade via FK on delete.
  const { error } = await admin
    .from("procedures")
    .delete()
    .eq("id", ctx.params.id);
  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
});
