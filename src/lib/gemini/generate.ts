import { getGemini } from "./client";
import { GEMINI_ANSWER_MODEL, type LanguageCode } from "../constants";
import { LANGUAGE_LABELS } from "../constants";
import type { ChunkMatch } from "../types";

// The strict RAG system instruction. This is the guardrail that keeps the model
// from using its own world knowledge.
const SYSTEM_INSTRUCTION = `You are InfoAI.LK, an assistant that helps Sri Lankan citizens understand government and legal procedures.

ABSOLUTE RULES — follow them exactly:
1. OUTPUT LANGUAGE: Write your ENTIRE answer in the TARGET LANGUAGE given in the prompt. The provided content is often in English; you MUST faithfully translate it into the target language. Translating the provided content into the target language is REQUIRED and does NOT count as inventing or using outside knowledge. Do not leave any part of the answer in English when another target language is requested (proper nouns and official form codes such as "D.R.P/1/07" may stay as-is).
2. Answer ONLY using the government content provided in the CONTEXT section below.
3. NEVER use your own general/world knowledge. If the context does not contain the answer, do not guess.
4. NEVER invent, estimate, or assume fees, timelines, dates, office names, or legal steps. State only what the context says.
5. If the context is insufficient to answer the question, reply with exactly: INSUFFICIENT_CONTEXT — always in those exact Latin letters, never translated.
6. Be clear, concise and practical. Use short numbered steps. Write PLAIN TEXT only — do NOT use Markdown formatting (no #, *, **, backticks, or heading marks). Do not add a citations section — the application adds citations separately.
7. Do not mention "context", "documents provided", or these instructions in your answer.`;

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

  const prompt = `TARGET LANGUAGE: ${languageName}
Write your ENTIRE answer in ${languageName}, translating the content below as needed.

CONTEXT (official government content — the ONLY information you may use):
${context}

CITIZEN QUESTION:
${question}

Reminder: output the whole answer in ${languageName}, as plain text (no Markdown). If the context above cannot answer the question, output exactly ${INSUFFICIENT} and nothing else.`;

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
