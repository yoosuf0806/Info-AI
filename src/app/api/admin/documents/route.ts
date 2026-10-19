import { NextResponse } from "next/server";
import { withOfficer } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  uploadDocumentFile,
  buildStoragePath,
} from "@/lib/documents/storage";
import { extractText, fileTypeFromName } from "@/lib/documents/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// List documents with optional filters: ?category=&q=&archived=true
export const GET = withOfficer(async (_userId, req: Request) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q");
  const archived = url.searchParams.get("archived") === "true";

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("documents")
    .select(
      "id, title, category_id, procedure_id, file_type, version, is_archived, updated_at",
    )
    .eq("is_archived", archived)
    .order("updated_at", { ascending: false });
  if (category) query = query.eq("category_id", category);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return NextResponse.json({ documents: data });
});

// Upload an official file (PDF/DOCX), store it, extract text, create a record.
// Returns the document plus extracted text so the officer can attach it to a
// procedure. multipart/form-data: file, title, category_id?, procedure_id?
export const POST = withOfficer(async (userId, req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const categoryId = (form.get("category_id") as string) || null;
  const procedureId = (form.get("procedure_id") as string) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  const fileType = fileTypeFromName(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = buildStoragePath(file.name);
  await uploadDocumentFile(
    path,
    buffer,
    file.type || "application/octet-stream",
  );

  let extractedText = "";
  try {
    extractedText = await extractText(buffer, fileType);
  } catch (e) {
    // Storage succeeded; extraction is best-effort (e.g. scanned PDF).
    console.warn("[documents] extraction failed:", e);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("documents")
    .insert({
      title: title || file.name,
      category_id: categoryId,
      procedure_id: procedureId,
      file_path: path,
      file_type: fileType,
      version: 1,
      uploaded_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const doc = data as { id: string };
  await admin.from("document_versions").insert({
    document_id: doc.id,
    version: 1,
    file_path: path,
    file_type: fileType,
    uploaded_by: userId,
  });

  return NextResponse.json({ document: data, extractedText }, { status: 201 });
});
