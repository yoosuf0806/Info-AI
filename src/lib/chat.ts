// Client-side conversation storage for anonymous citizens. Threads live in the
// browser (localStorage) only — no account, no server sync. Keeps the system's
// anonymous model intact while giving "New chat" + history.
import type { LanguageCode } from "./constants";
import type { Citation, StructuredAnswer } from "./types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string; // user's question, or assistant's plain-text answer
  answered?: boolean;
  structured?: StructuredAnswer | null;
  citations?: Citation[];
  autoTranslated?: boolean;
  queryId?: string | null;
  error?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  lang: LanguageCode;
  messages: ChatMessage[];
  updatedAt: number;
}

const THREADS_KEY = "infoai.threads";
const MAX_THREADS = 30;

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function newThread(lang: LanguageCode): Thread {
  return { id: uid(), title: "", lang, messages: [], updatedAt: Date.now() };
}

export function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Thread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]): void {
  try {
    const trimmed = [...threads]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_THREADS);
    localStorage.setItem(THREADS_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable / quota — history is best-effort */
  }
}

// Turn a thread's messages into the bounded history the /api/ask API expects.
export function toHistory(
  messages: ChatMessage[],
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.text && (m.role === "user" || m.answered))
    .map((m) => ({ role: m.role, content: m.text }));
}
