import { createSupabaseAdminClient } from "../supabase/admin";
import { embedQuery } from "../gemini/embeddings";
import { generateAnswer } from "../gemini/generate";
import {
  RAG_TOP_K,
  RAG_MATCH_THRESHOLD,
  GIC_HOTLINE,
  type LanguageCode,
} from "../constants";
import type {
  AskResponse,
  ChatTurn,
  ChunkMatch,
  Citation,
} from "../types";

const FALLBACK: Record<LanguageCode, string> = {
  en: `I don't have verified government information on that yet. Please contact the Government Information Centre on ${GIC_HOTLINE} for help.`,
  si: `මට තවම ඒ පිළිබඳ තහවුරු කළ රාජ්‍ය තොරතුරු නොමැත. කරුණාකර උදව් සඳහා රජයේ තොරතුරු මධ්‍යස්ථානය ${GIC_HOTLINE} අමතන්න.`,
  ta: `அது குறித்த சரிபார்க்கப்பட்ட அரசு தகவல் இன்னும் என்னிடம் இல்லை. உதவிக்கு அரசாங்க தகவல் மையத்தை ${GIC_HOTLINE} என்ற எண்ணில் தொடர்பு கொள்ளவும்.`,
};

function fallbackResponse(
  language: LanguageCode,
  queryId: string | null,
): AskResponse {
  return {
    answered: false,
    answer: FALLBACK[language],
    structured: null,
    citations: [],
    autoTranslated: false,
    language,
    queryId,
  };
}

// Build the vector-search query. For follow-ups the latest question alone may be
// ambiguous ("how much for that?"), so we prepend the recent user turns to give
// retrieval enough to find the right procedure.
function buildRetrievalQuery(question: string, history: ChatTurn[]): string {
  const recentUser = history
    .filter((h) => h.role === "user")
    .slice(-2)
    .map((h) => h.content);
  return [...recentUser, question].join("\n").slice(0, 2000);
}

// End-to-end RAG: embed → retrieve → (verified-translation override) → generate
// (structured, multi-turn aware) → build citations → log. Returns the response
// and the query id for feedback.
export async function answerQuestion(
  question: string,
  language: LanguageCode,
  history: ChatTurn[] = [],
): Promise<AskResponse> {
  const admin = createSupabaseAdminClient();

  // 1–3. Embed the (context-aware) query and vector-search published chunks.
  const queryEmbedding = await embedQuery(
    buildRetrievalQuery(question, history),
  );
  const { data: matchesRaw, error: matchErr } = await admin.rpc(
    "match_procedure_chunks",
    {
      query_embedding: queryEmbedding,
      match_count: RAG_TOP_K,
      match_threshold: RAG_MATCH_THRESHOLD,
    },
  );
  if (matchErr) throw new Error(`Retrieval failed: ${matchErr.message}`);

  const matches = (matchesRaw || []) as ChunkMatch[];

  // 4. Nothing cleared the threshold → "no information" fallback.
  if (matches.length === 0) {
    const queryId = await logQuery(question, language, [], null, false);
    return fallbackResponse(language, queryId);
  }

  // Verified-translation override: for procedures not authored in the target
  // language, prefer an officer-verified translation when one exists.
  const procedureIds = Array.from(new Set(matches.map((m) => m.procedure_id)));
  const { data: translations } = await admin
    .from("procedure_translations")
    .select("procedure_id, language, verified_body")
    .in("procedure_id", procedureIds)
    .eq("language", language);

  const verifiedByProcedure = new Map<string, string>();
  for (const t of (translations || []) as Array<{
    procedure_id: string;
    verified_body: string;
  }>) {
    verifiedByProcedure.set(t.procedure_id, t.verified_body);
  }

  let anyAutoTranslated = false;
  const contextChunks: ChunkMatch[] = matches.map((m) => {
    const needsTranslation = m.authoring_language !== language;
    if (!needsTranslation) return m;
    const verified = verifiedByProcedure.get(m.procedure_id);
    if (verified) return { ...m, chunk_text: verified };
    anyAutoTranslated = true;
    return m;
  });

  // 5–6. Generate strictly from context, in the target language, conversation-aware.
  const { answered, structured, text } = await generateAnswer(
    question,
    contextChunks,
    language,
    history,
  );

  if (!answered) {
    const queryId = await logQuery(
      question,
      language,
      matches.map((m) => m.chunk_id),
      null,
      false,
    );
    return fallbackResponse(language, queryId);
  }

  // 7. Build de-duplicated citations (one per procedure).
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (seen.has(m.procedure_id)) continue;
    seen.add(m.procedure_id);
    citations.push({
      procedureId: m.procedure_id,
      title: m.procedure_title,
      sourceDepartment: m.source_department,
      lastVerifiedDate: m.last_verified_date,
    });
  }

  // 8. Log anonymously.
  const queryId = await logQuery(
    question,
    language,
    matches.map((m) => m.chunk_id),
    text,
    true,
  );

  return {
    answered: true,
    answer: text,
    structured,
    citations,
    autoTranslated: anyAutoTranslated,
    language,
    queryId,
  };
}

async function logQuery(
  question: string,
  language: LanguageCode,
  chunkIds: string[],
  answerText: string | null,
  answered: boolean,
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("queries")
    .insert({
      question_text: question,
      language,
      retrieved_chunk_ids: chunkIds,
      answer_text: answerText,
      answered,
    })
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string }).id;
}
