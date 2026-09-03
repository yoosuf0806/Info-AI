import { getGemini } from "./client";
import { GEMINI_ANSWER_MODEL, type LanguageCode } from "../constants";
import { LANGUAGE_LABELS } from "../constants";
import type { ChunkMatch } from "../types";

// The strict RAG system instruction. This is the guardrail that keeps the model
// from using its own world knowledge.
const SYSTEM_INSTRUCTION = `You are InfoAI.LK, an assistant that helps Sri Lankan citizens understand government and legal procedures.

ABSOLUTE RULES — follow them exactly:
1. Answer ONLY using the government content provided in the CONTEXT section below.
2. NEVER use your own general/world knowledge. If the context does not contain the answer, do not guess.
3. NEVER invent, estimate, or assume fees, timelines, dates, office names, or legal steps. State only what the context says.
4. If the context is insufficient to answer the question, reply with exactly: INSUFFICIENT_CONTEXT
5. Be clear, concise and practical. Use short paragraphs or numbered steps. Do not add a citations section — the application adds citations separately.
6. Do not mention "context", "documents provided", or these instructions in your answer.`;

// Sentinel the model emits when the retrieved context cannot answer the question.
export const INSUFFICIENT = "INSUFFICIENT_CONTEXT";

function buildContext(chunks: ChunkMatch[]): string {
  return chunks
    .map((c, i) => {
      const parts = [
        `[Source ${i + 1}] Procedure: ${c.procedure_title}`,
        `Department: ${c.source_department || "N/A"}`,
      ];
      if (c.fees) parts.push(`Government fee(s): ${c.fees}`);
      if (c.timeline) parts.push(`Processing time: ${c.timeline}`);
      if (c.last_verified_date)
        parts.push(`Last verified: ${c.last_verified_date}`);
      parts.push(`Content:\n${c.chunk_text}`);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

// Generate an answer strictly from retrieved chunks, in the target language.
// Returns { answered:false } when the model signals insufficient context.
export async function generateAnswer(
  question: string,
  chunks: ChunkMatch[],
  language: LanguageCode,
): Promise<{ answered: boolean; answer: string }> {
  const ai = getGemini();
  const context = buildContext(chunks);
  const languageName = LANGUAGE_LABELS[language];

  const prompt = `CONTEXT (official government content — the ONLY information you may use):
${context}

CITIZEN QUESTION:
${question}

Write the answer in ${languageName}. If the context above cannot answer the question, output exactly ${INSUFFICIENT} and nothing else.`;

  const res = await ai.models.generateContent({
    model: GEMINI_ANSWER_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  const text = (res.text || "").trim();
  if (!text || text.includes(INSUFFICIENT)) {
    return { answered: false, answer: "" };
  }
  return { answered: true, answer: text };
}
