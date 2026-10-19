import { createSupabaseAdminClient } from "../supabase/admin";
import { embedDocument } from "../gemini/embeddings";
import { chunkText } from "./chunk";

// (Re)build the vector index for a single procedure: delete old chunks, chunk
// the current body, embed each chunk, and insert. Called on publish/update and
// by the reindex endpoint. Uses the service-role client (bypasses RLS).
//
// The title is prepended to the first chunk's embedding text so title-only
// questions ("lost NIC") still retrieve well.
export async function indexProcedure(procedureId: string): Promise<{
  chunks: number;
}> {
  const admin = createSupabaseAdminClient();

  const { data: proc, error } = await admin
    .from("procedures")
    .select("id, title, body, status")
    .eq("id", procedureId)
    .single();
  if (error || !proc) throw new Error(`Procedure not found: ${procedureId}`);

  // Always clear existing chunks first.
  await admin.from("procedure_chunks").delete().eq("procedure_id", procedureId);

  // Only published procedures are retrievable, so only they need chunks.
  if ((proc as { status: string }).status !== "published") {
    return { chunks: 0 };
  }

  const title = (proc as { title: string }).title || "";
  const body = (proc as { body: string }).body || "";
  const pieces = chunkText(body);
  if (pieces.length === 0) return { chunks: 0 };

  const rows = [];
  for (let i = 0; i < pieces.length; i++) {
    const embedInput = i === 0 ? `${title}\n\n${pieces[i]}` : pieces[i];
    const embedding = await embedDocument(embedInput);
    rows.push({
      procedure_id: procedureId,
      chunk_index: i,
      chunk_text: pieces[i],
      embedding,
    });
  }

  const { error: insErr } = await admin.from("procedure_chunks").insert(rows);
  if (insErr) throw new Error(`Failed to store chunks: ${insErr.message}`);

  return { chunks: rows.length };
}
