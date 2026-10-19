import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedDocumentUrl } from "@/lib/documents/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// Fetch a document with its version history and a signed download URL.
export const GET = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("documents")
    .select("*")
    .eq("id", ctx.params.id)
    .single();
  if (error) throw new Error(error.message);

  const { data: versions } = await admin
    .from("document_versions")
    .select("*")
    .eq("document_id", ctx.params.id)
    .order("version", { ascending: false });

  const doc = data as { file_path: string };
  let downloadUrl: string | null = null;
  try {
    downloadUrl = await signedDocumentUrl(doc.file_path);
  } catch {
    downloadUrl = null;
  }

  return NextResponse.json({
    document: data,
    versions: versions ?? [],
    downloadUrl,
  });
});

// Update metadata: title, category, linked procedure, archive/restore.
export const PATCH = withOfficer(async (_userId, req: Request, ctx: Ctx) => {
  const b = await readJson<{
    title?: string;
    category_id?: string | null;
    procedure_id?: string | null;
    is_archived?: boolean;
  }>(req);
  const patch: Record<string, unknown> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if ("category_id" in b) patch.category_id = b.category_id ?? null;
  if ("procedure_id" in b) patch.procedure_id = b.procedure_id ?? null;
  if (typeof b.is_archived === "boolean") patch.is_archived = b.is_archived;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No changes." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("documents")
    .update(patch)
    .eq("id", ctx.params.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ document: data });
});

export const DELETE = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("documents")
    .delete()
    .eq("id", ctx.params.id);
  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
});
