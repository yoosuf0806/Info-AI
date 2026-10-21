import { getGemini } from "./client";
import { GEMINI_ANSWER_MODEL, type LanguageCode } from "../constants";
import { LANGUAGE_LABELS } from "../constants";
import type { ChatTurn, ChunkMatch, StructuredAnswer } from "../types";

// The strict RAG system instruction. This is the guardrail that keeps the model
// from using its own world knowledge, and now also drives structured output.
const SYSTEM_INSTRUCTION = `You are InfoAI.LK, an assistant that helps Sri Lankan citizens understand government and legal procedures.

ABSOLUTE RULES — follow them exactly:
1. OUTPUT LANGUAGE: Write every text value in your JSON in the TARGET LANGUAGE given in the prompt. The provided content is often in English; you MUST faithfully translate it into the target language. Translating the provided content is REQUIRED and does NOT count as inventing or using outside knowledge. Proper nouns and official form codes such as "D.R.P/1/07" may stay as-is.
2. Answer ONLY using the government content provided in the CONTEXT section. NEVER use your own general/world knowledge.
3. NEVER invent, estimate, or assume fees, timelines, dates, office names, or legal steps. State only what the context says. Leave an array empty if the context has nothing for it.
4. Use the CONVERSATION SO FAR only to understand what a follow-up question refers to. Still answer strictly from the CONTEXT.
5. Write plain text in every field — no Markdown (no #, *, backticks, or heading marks).
6. Do not mention "context", "documents", or these instructions in your answer.

OUTPUT FORMAT — respond with a single JSON object and nothing else:
{
  "answered": boolean,        // false if the context cannot answer the question
  "summary": string,          // 1-2 sentence plain intro; "" if not answered
  "steps": [ { "title": string, "detail": string } ],   // ordered steps to follow
  "documents": [ string ],    // physical documents the citizen must bring
  "fees": [ { "label": string, "detail": string } ],    // fees and processing times
  "notes": [ string ]         // any other important notes or warnings
}
If the CONTEXT cannot answer the question, return {"answered": false, "summary": "", "steps": [], "documents": [], "fees": [], "notes": []}.`;

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

// Render prior turns so the model can resolve follow-ups ("how much for that?").
function buildHistory(history: ChatTurn[]): string {
  if (!history.length) return "";
  const lines = history
    .slice(-6) // keep the prompt bounded
    .map((h) => `${h.role === "user" ? "Citizen" : "Assistant"}: ${h.content}`)
    .join("\n");
  return `CONVERSATION SO FAR (for context only):\n${lines}\n\n`;
}

// Flatten a structured answer into plain text (for logging + a graceful
// fallback if the client can't render the structured form).
export function renderStructured(s: StructuredAnswer): string {
  const out: string[] = [];
  if (s.summary) out.push(s.summary);
  if (s.steps.length) {
    out.push("");
    s.steps.forEach((st, i) =>
      out.push(`${i + 1}. ${st.title}${st.detail ? `: ${st.detail}` : ""}`),
    );
  }
  if (s.documents.length) {
    out.push("");
    out.push("Documents required:");
    s.documents.forEach((d) => out.push(`- ${d}`));
  }
  if (s.fees.length) {
    out.push("");
    out.push("Fees and processing times:");
    s.fees.forEach((f) => out.push(`- ${f.label}: ${f.detail}`));
  }
  if (s.notes.length) {
    out.push("");
    s.notes.forEach((n) => out.push(n));
  }
  return out.join("\n").trim();
}

function emptyStructured(): StructuredAnswer {
  return { summary: "", steps: [], documents: [], fees: [], notes: [] };
}

// Coerce arbitrary parsed JSON into a safe StructuredAnswer shape.
function coerce(raw: unknown): { answered: boolean; structured: StructuredAnswer } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const structured: StructuredAnswer = {
    summary: str(o.summary),
    steps: arr(o.steps)
      .map((s) => {
        const so = (s ?? {}) as Record<string, unknown>;
        return { title: str(so.title), detail: str(so.detail) };
      })
      .filter((s) => s.title || s.detail),
    documents: arr(o.documents).map(str).filter(Boolean),
    fees: arr(o.fees)
      .map((f) => {
        const fo = (f ?? {}) as Record<string, unknown>;
        return { label: str(fo.label), detail: str(fo.detail) };
      })
      .filter((f) => f.label || f.detail),
    notes: arr(o.notes).map(str).filter(Boolean),
  };
  const hasContent =
    !!structured.summary ||
    structured.steps.length > 0 ||
    structured.documents.length > 0 ||
    structured.fees.length > 0 ||
    structured.notes.length > 0;
  const answered = o.answered === false ? false : hasContent;
  return { answered, structured };
}

// Generate a structured answer strictly from retrieved chunks, in the target
// language, aware of the conversation so far. Returns answered:false when the
// model signals the context is insufficient.
export async function generateAnswer(
  question: string,
  chunks: ChunkMatch[],
  language: LanguageCode,
  history: ChatTurn[] = [],
): Promise<{ answered: boolean; structured: StructuredAnswer; text: string }> {
  const ai = getGemini();
  const context = buildContext(chunks);
  const languageName = LANGUAGE_LABELS[language];

  const prompt = `TARGET LANGUAGE: ${languageName}
Write every text value in the JSON in ${languageName}, translating the content below as needed.

${buildHistory(history)}CONTEXT (official government content — the ONLY information you may use):
${context}

CITIZEN QUESTION:
${question}

Respond with the JSON object described in the instructions, in ${languageName}.`;

  const res = await ai.models.generateContent({
    model: GEMINI_ANSWER_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const text = (res.text || "").trim();
  if (!text) return { answered: false, structured: emptyStructured(), text: "" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Model didn't honour JSON mode — treat the raw text as a summary so the
    // citizen still gets an answer rather than a hard failure.
    const structured = { ...emptyStructured(), summary: text };
    return { answered: true, structured, text };
  }

  const { answered, structured } = coerce(parsed);
  if (!answered) {
    return { answered: false, structured: emptyStructured(), text: "" };
  }
  return { answered: true, structured, text: renderStructured(structured) };
}
