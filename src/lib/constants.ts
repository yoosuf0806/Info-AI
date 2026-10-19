// Central runtime configuration. Server-only secrets are read from process.env
// inside server modules; nothing here is exposed to the browser except the
// explicitly public values.

export const LANGUAGES = ["en", "si", "ta"] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguage(v: unknown): v is LanguageCode {
  return typeof v === "string" && (LANGUAGES as readonly string[]).includes(v);
}

// The Government Information Centre hotline shown in the "no information" fallback.
export const GIC_HOTLINE = "1919";

// --- Gemini / RAG config (server-side reads) -------------------------------
export const GEMINI_ANSWER_MODEL =
  process.env.GEMINI_ANSWER_MODEL || "gemini-2.5-flash";
export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const GEMINI_EMBEDDING_DIM = Number(
  process.env.GEMINI_EMBEDDING_DIM || 768,
);
export const RAG_TOP_K = Number(process.env.RAG_TOP_K || 6);
export const RAG_MATCH_THRESHOLD = Number(
  process.env.RAG_MATCH_THRESHOLD || 0.6,
);

export const DOCUMENTS_BUCKET =
  process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";
