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

type Ctx = { params: { id: string } };

// Replace a document with a new version. Keeps history: the old version row
// remains; the documents row points at the newest file. multipart: file
export const POST = withOfficer(async (userId, req: Request, ctx: Ctx) => {
  const form = await req.formData();
  const file = form.get("file");
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

  const admin = createSupabaseAdminClient();
  const { data: current, error: curErr } = await admin
    .from("documents")
    .select("version")
    .eq("id", ctx.params.id)
    .single();
  if (curErr || !current) throw new Error("Document not found.");

  const nextVersion = (current as { version: number }).version + 1;
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = buildStoragePath(file.name, "uploads");
  await uploadDocumentFile(
    path,
    buffer,
    file.type || "application/octet-stream",
  );

  let extractedText = "";
  try {
    extractedText = await extractText(buffer, fileType);
  } catch {
    /* best-effort */
  }

  await admin.from("document_versions").insert({
    document_id: ctx.params.id,
    version: nextVersion,
    file_path: path,
    file_type: fileType,
    uploaded_by: userId,
  });

  const { data, error } = await admin
    .from("documents")
    .update({ file_path: path, file_type: fileType, version: nextVersion })
    .eq("id", ctx.params.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return NextResponse.json({ document: data, extractedText }, { status: 201 });
});
