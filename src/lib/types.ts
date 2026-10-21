import type { LanguageCode } from "./constants";

export type ProcedureStatus = "draft" | "published";
export type FeedbackValue = "up" | "down";

export interface Category {
  id: string;
  name: string;
  slug: string | null;
  display_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Procedure {
  id: string;
  category_id: string | null;
  title: string;
  body: string;
  source_department: string;
  fees: string | null;
  timeline: string | null;
  authoring_language: LanguageCode;
  last_verified_date: string | null;
  status: ProcedureStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcedureTranslation {
  id: string;
  procedure_id: string;
  language: LanguageCode;
  verified_body: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  category_id: string | null;
  procedure_id: string | null;
  title: string;
  file_path: string;
  file_type: string | null;
  version: number;
  is_archived: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedQuestion {
  id: string;
  category_id: string | null;
  question_text: string;
  display_order: number;
  is_active: boolean;
}

// A citation surfaced to the citizen alongside an answer.
export interface Citation {
  procedureId: string;
  title: string;
  sourceDepartment: string;
  lastVerifiedDate: string | null;
}

// The retrieval hit shape returned by the match_procedure_chunks RPC.
export interface ChunkMatch {
  chunk_id: string;
  procedure_id: string;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
  procedure_title: string;
  source_department: string;
  fees: string | null;
  timeline: string | null;
  authoring_language: LanguageCode;
  last_verified_date: string | null;
  category_id: string | null;
}

// A single conversational turn sent from the client for multi-turn context.
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Structured, section-based answer the model produces so the UI can render
// clean Steps / Documents / Fees cards instead of one text blob. All text is
// already in the citizen's target language.
export interface AnswerStep {
  title: string;
  detail: string;
}

export interface AnswerFee {
  label: string;
  detail: string;
}

export interface StructuredAnswer {
  summary: string; // short intro paragraph
  steps: AnswerStep[]; // "Steps to apply"
  documents: string[]; // "Documents required"
  fees: AnswerFee[]; // "Fees and processing times"
  notes: string[]; // extra notes / warnings / processing times
}

// The full answer payload returned by /api/ask.
export interface AskResponse {
  answered: boolean;
  answer: string; // plain-text rendering (fallback + logging)
  structured: StructuredAnswer | null; // null when not answered or parse failed
  citations: Citation[];
  autoTranslated: boolean;
  language: LanguageCode;
  queryId: string | null;
}
