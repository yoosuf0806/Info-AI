"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from "react";
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from "@/lib/constants";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import type { AskResponse } from "@/lib/types";
import {
  loadThreads,
  saveThreads,
  newThread,
  toHistory,
  uid,
  type Thread,
  type ChatMessage,
} from "@/lib/chat";
import {
  categoryIcon,
  SparkleIcon,
  SendIcon,
  PlusIcon,
  ClockIcon,
  ChevronIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "./icons";

const LANG_KEY = "infoai.lang";
const SHORT_LABELS: Record<LanguageCode, string> = {
  en: "EN",
  si: "සිං",
  ta: "தமி",
};

interface Category {
  id: string;
  name: string;
  slug: string | null;
}

export default function CitizenApp() {
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const t = getDictionary(lang);
  const threadsRef = useRef<Thread[]>([]);
  const currentIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  threadsRef.current = threads;
  currentIdRef.current = currentId;

  const current = threads.find((th) => th.id === currentId) ?? null;

  // ---- init: language + threads + lookups -------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && (LANGUAGES as readonly string[]).includes(saved)) {
        setLang(saved as LanguageCode);
      }
    } catch {
      /* ignore */
    }
    const existing = loadThreads();
    if (existing.length > 0) {
      setThreads(existing);
      setCurrentId(existing[0].id);
    } else {
      const th = newThread(DEFAULT_LANGUAGE);
      setThreads([th]);
      setCurrentId(th.id);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
    fetch("/api/suggested-questions")
      .then((r) => r.json())
      .then((d) => setSuggested(d.questions ?? []))
      .catch(() => setSuggested([]));
  }, []);

  // Persist on change.
  useEffect(() => {
    if (threads.length) saveThreads(threads);
  }, [threads]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [current?.messages.length, loading]);

  // ---- actions ----------------------------------------------------------
  const patchThread = useCallback(
    (id: string, fn: (th: Thread) => Thread) => {
      setThreads((prev) => prev.map((th) => (th.id === id ? fn(th) : th)));
    },
    [],
  );

  const ask = useCallback(
    async (raw: string) => {
      const query = raw.trim();
      if (query.length < 2 || loading) return;
      const id = currentIdRef.current;
      if (!id) return;

      const thread = threadsRef.current.find((th) => th.id === id);
      const history = thread ? toHistory(thread.messages) : [];
      const askLang = thread?.lang ?? lang;

      const userMsg: ChatMessage = { id: uid(), role: "user", text: query };
      patchThread(id, (th) => ({
        ...th,
        title: th.title || query.slice(0, 80),
        messages: [...th.messages, userMsg],
        updatedAt: Date.now(),
      }));
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, language: askLang, history }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.errorGeneric);
        const r = data as AskResponse;
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          text: r.answer,
          answered: r.answered,
          structured: r.structured,
          citations: r.citations,
          autoTranslated: r.autoTranslated,
          queryId: r.queryId,
        };
        patchThread(id, (th) => ({
          ...th,
          messages: [...th.messages, assistantMsg],
          updatedAt: Date.now(),
        }));
      } catch (e) {
        const errMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          text: e instanceof Error ? e.message : t.errorGeneric,
          answered: false,
          error: true,
        };
        patchThread(id, (th) => ({
          ...th,
          messages: [...th.messages, errMsg],
          updatedAt: Date.now(),
        }));
      } finally {
        setLoading(false);
      }
    },
    [loading, lang, patchThread, t.errorGeneric],
  );

  const startNewChat = useCallback(() => {
    const existingEmpty = threadsRef.current.find(
      (th) => th.messages.length === 0,
    );
    if (existingEmpty) {
      setCurrentId(existingEmpty.id);
    } else {
      const th = newThread(lang);
      setThreads((prev) => [th, ...prev]);
      setCurrentId(th.id);
    }
    setHistoryOpen(false);
    setInput("");
  }, [lang]);

  const openThread = useCallback((th: Thread) => {
    setCurrentId(th.id);
    setLang(th.lang);
    setHistoryOpen(false);
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const showLanding = !current || current.messages.length === 0;
  const pastThreads = threads
    .filter((th) => th.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  // ---- render -----------------------------------------------------------
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="relative z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2"
            aria-label={t.appName}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <SparkleIcon width={18} height={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-ink-900">
              InfoAI<span className="text-brand-600">.LK</span>
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={startNewChat}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-slate-50 sm:flex"
            >
              <PlusIcon width={16} height={16} /> {t.newChat}
            </button>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              aria-label={t.history}
              aria-expanded={historyOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-ink-700 hover:bg-slate-50"
            >
              <ClockIcon width={18} height={18} />
            </button>
            <LanguageToggle lang={lang} onChange={setLang} label={t.languageLabel} />
          </div>
        </div>

        {historyOpen && (
          <HistoryPanel
            threads={pastThreads}
            onPick={openThread}
            onNew={startNewChat}
            t={t}
          />
        )}
      </header>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          {showLanding ? (
            <Landing
              t={t}
              categories={categories}
              suggested={suggested}
              onPick={(q) => ask(q)}
              onCategory={(name) => {
                setInput(name + " — ");
              }}
            />
          ) : (
            <div className="space-y-5 pb-4">
              {current!.messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} text={m.text} />
                ) : (
                  <AnswerCard key={m.id} msg={m} t={t} />
                ),
              )}
              {loading && <PendingCard t={t} />}
            </div>
          )}
        </main>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">
              {t.askPlaceholder}
            </label>
            <input
              id="q"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.askPlaceholder}
              autoComplete="off"
              className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 text-base shadow-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length < 2}
              aria-label={t.askButton}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-40"
            >
              <SendIcon width={20} height={20} />
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-ink-500">{t.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

// ---- Landing ------------------------------------------------------------
function Landing({
  t,
  categories,
  suggested,
  onPick,
  onCategory,
}: {
  t: Dictionary;
  categories: Category[];
  suggested: string[];
  onPick: (q: string) => void;
  onCategory: (name: string) => void;
}) {
  return (
    <div className="space-y-10 py-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {t.heroTitle}
        </h1>
        <p className="mt-2 text-ink-500">{t.heroSubtitle}</p>
      </div>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-500">
            {t.browseHeading}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => {
              const Icon = categoryIcon(c.slug || c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => onCategory(c.name)}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon width={20} height={20} />
                  </span>
                  <span className="font-semibold text-ink-900">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-500">
            {t.popularHeading}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {suggested.map((q, i) => (
              <button
                key={q}
                onClick={() => onPick(q)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-ink-900 hover:bg-slate-50 ${
                  i > 0 ? "border-t border-slate-100" : ""
                }`}
              >
                <span>{q}</span>
                <ChevronIcon width={18} height={18} className="text-ink-500" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Chat bubbles -------------------------------------------------------
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-white">
        {text}
      </div>
    </div>
  );
}

function PendingCard({ t }: { t: Dictionary }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm text-ink-500">{t.asking}</p>
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-11/12 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-9/12 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function AnswerCard({ msg, t }: { msg: ChatMessage; t: Dictionary }) {
  if (msg.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
        {msg.text}
      </div>
    );
  }
  if (!msg.answered) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-900">{t.noInfoHeading}</h2>
        <p className="mt-1 text-amber-900">{msg.text}</p>
      </div>
    );
  }

  const s = msg.structured;
  const hasSections =
    !!s &&
    (s.steps.length > 0 ||
      s.documents.length > 0 ||
      s.fees.length > 0 ||
      s.notes.length > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {msg.autoTranslated && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
          <span aria-hidden>⚠</span>
          {t.autoTranslatedNotice}
        </div>
      )}

      {s && s.summary && (
        <p className="prose-answer text-ink-900">{s.summary}</p>
      )}

      {/* Structured sections, or plain-text fallback. */}
      {hasSections ? (
        <div className="mt-5 space-y-6">
          {s!.steps.length > 0 && (
            <section>
              <h3 className="mb-3 font-bold text-ink-900">{t.stepsHeading}</h3>
              <ol className="space-y-3">
                {s!.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="text-ink-900">
                      <span className="font-semibold">{step.title}</span>
                      {step.detail ? <>: {step.detail}</> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {s!.documents.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-ink-900">
                {t.documentsHeading}
              </h3>
              <ul className="space-y-1.5">
                {s!.documents.map((d, i) => (
                  <li key={i} className="flex gap-2.5 text-ink-900">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s!.fees.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-ink-900">{t.feesHeading}</h3>
              <ul className="space-y-1.5">
                {s!.fees.map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-ink-900">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>
                      <span className="font-semibold">{f.label}</span>
                      {f.detail ? <>: {f.detail}</> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s!.notes.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-ink-900">{t.notesHeading}</h3>
              <ul className="space-y-1.5">
                {s!.notes.map((n, i) => (
                  <li key={i} className="flex gap-2.5 text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        !s?.summary && <p className="prose-answer text-ink-900">{msg.text}</p>
      )}

      {msg.citations && msg.citations.length > 0 && (
        <details className="group mt-5 rounded-xl bg-slate-50 open:bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-ink-700">
            <ChevronIcon
              width={16}
              height={16}
              className="transition group-open:rotate-90"
            />
            {t.sourcesHeading} ({msg.citations.length})
          </summary>
          <ul className="space-y-2 px-4 pb-4">
            {msg.citations.map((c) => (
              <li
                key={c.procedureId}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <div className="font-medium text-ink-900">{c.title}</div>
                <div className="text-ink-500">
                  {c.sourceDepartment}
                  {c.lastVerifiedDate && (
                    <>
                      {" · "}
                      {t.lastVerified}: {c.lastVerifiedDate}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <FeedbackThumbs queryId={msg.queryId ?? null} t={t} />
    </div>
  );
}

function FeedbackThumbs({
  queryId,
  t,
}: {
  queryId: string | null;
  t: Dictionary;
}) {
  const [sent, setSent] = useState<"up" | "down" | null>(null);
  if (!queryId) return null;

  const vote = async (feedback: "up" | "down") => {
    if (sent) return;
    setSent(feedback);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryId, feedback }),
      });
    } catch {
      /* best-effort */
    }
  };

  if (sent) {
    return <p className="mt-4 text-sm text-ink-500">{t.thanksFeedback}</p>;
  }

  return (
    <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
      <span className="text-sm text-ink-500">{t.feedbackPrompt}</span>
      <button
        onClick={() => vote("up")}
        aria-label="Helpful"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-ink-500 hover:bg-slate-50 hover:text-brand-600"
      >
        <ThumbsUpIcon width={18} height={18} />
      </button>
      <button
        onClick={() => vote("down")}
        aria-label="Not helpful"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-ink-500 hover:bg-slate-50 hover:text-red-500"
      >
        <ThumbsDownIcon width={18} height={18} />
      </button>
    </div>
  );
}

// ---- History panel ------------------------------------------------------
function HistoryPanel({
  threads,
  onPick,
  onNew,
  t,
}: {
  threads: Thread[];
  onPick: (th: Thread) => void;
  onNew: () => void;
  t: Dictionary;
}) {
  return (
    <div className="absolute inset-x-0 top-full z-20 border-b border-slate-200 bg-white shadow-lg">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <button
          onClick={onNew}
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          <PlusIcon width={16} height={16} /> {t.newChat}
        </button>
        {threads.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-500">{t.noHistory}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {threads.map((th) => (
              <li key={th.id}>
                <button
                  onClick={() => onPick(th)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <ClockIcon
                    width={16}
                    height={16}
                    className="shrink-0 text-ink-500"
                  />
                  <span className="truncate text-sm text-ink-900">
                    {th.title || "…"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- Language toggle ----------------------------------------------------
function LanguageToggle({
  lang,
  onChange,
  label,
}: {
  lang: LanguageCode;
  onChange: (l: LanguageCode) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-full border border-slate-200 bg-slate-100 p-0.5"
    >
      {LANGUAGES.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 text-sm transition ${
            lang === l
              ? "bg-white font-semibold text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          {SHORT_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
