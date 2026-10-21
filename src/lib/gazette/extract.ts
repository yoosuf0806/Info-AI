import { getGemini } from "../gemini/client";
import { GEMINI_ANSWER_MODEL, GAZETTE_MAX_CHARS } from "../constants";

// A candidate procedure update extracted from a Gazette, pending officer review.
export interface GazetteCandidate {
  title: string;
  body: string;
  source_department: string;
  fees: string;
  timeline: string;
  category: string; // one of the provided category names, or ""
  source_excerpt: string;
  relevance: string;
}

const SYSTEM = `You maintain a catalogue of citizen-facing Sri Lankan government procedures (how to apply for IDs, licences, certificates, pay fees, etc.).

You are given the raw text of a government Gazette. Extract ONLY changes that affect how an ordinary citizen completes a government procedure — new or changed fees, forms, steps, eligibility, office/department responsibilities, or a newly introduced citizen service.

STRICT RULES:
- Use ONLY what the Gazette text states. Do NOT add outside knowledge or guess.
- Ignore purely internal/administrative matters (appointments, land acquisitions, tenders, company notices, by-laws with no citizen procedure) — return [] for those.
- Each item's "body" must be a clear, plain-text, step-by-step description a citizen can follow, drawn strictly from the text.
- "source_excerpt" must quote the relevant sentence(s) from the Gazette verbatim.
- "category" must be exactly one of the provided category names, or "" if none fit.

OUTPUT: a single JSON array (possibly empty). Each element:
{ "title": string, "body": string, "source_department": string, "fees": string, "timeline": string, "category": string, "source_excerpt": string, "relevance": string }`;

function coerceArray(raw: unknown): GazetteCandidate[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return raw
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        title: str(o.title),
        body: str(o.body),
        source_department: str(o.source_department),
        fees: str(o.fees),
        timeline: str(o.timeline),
        category: str(o.category),
        source_excerpt: str(o.source_excerpt),
        relevance: str(o.relevance),
      };
    })
    .filter((c) => c.title && c.body);
}

// Ask the model to pull citizen-facing candidate updates from a Gazette's text.
// Returns [] when nothing relevant is found (the common case for most gazettes).
export async function extractCandidates(
  gazetteText: string,
  categoryNames: string[],
): Promise<GazetteCandidate[]> {
  const text = gazetteText.slice(0, GAZETTE_MAX_CHARS);
  if (text.trim().length < 50) return [];

  const ai = getGemini();
  const prompt = `Available categories: ${
    categoryNames.length ? categoryNames.join(", ") : "(none)"
  }

GAZETTE TEXT:
${text}

Return the JSON array described in the instructions.`;

  const res = await ai.models.generateContent({
    model: GEMINI_ANSWER_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM,
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const out = (res.text || "").trim();
  if (!out) return [];
  try {
    return coerceArray(JSON.parse(out));
  } catch {
    return [];
  }
}
