"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from "@/lib/constants";
import { getDictionary } from "@/i18n/dictionaries";
import type { AskResponse } from "@/lib/types";

const LANG_KEY = "infoai.lang";

export default function CitizenApp() {
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);

  const t = getDictionary(lang);

  // Restore language preference.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && (LANGUAGES as readonly string[]).includes(saved)) {
        setLang(saved as LanguageCode);
      }
    } catch {
      /* storage unavailable */
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

  // Load suggested-question chips.
  useEffect(() => {
    fetch("/api/suggested-questions")
      .then((r) => r.json())
      .then((d) => setSuggested(d.questions ?? []))
      .catch(() => setSuggested([]));
  }, []);

  const ask = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (query.length < 2) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, language: lang }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.errorGeneric);
        setResult(data as AskResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.errorGeneric);
      } finally {
        setLoading(false);
      }
    },
    [lang, t.errorGeneric],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-800 text-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.appName}</h1>
            <p className="text-brand-100 text-sm">{t.tagline}</p>
          </div>
          <LanguageToggle lang={lang} onChange={setLang} label={t.languageLabel} />
        </div>
      </header>

      {/* Main two-panel layout */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Question panel */}
        <section>
          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="q" className="sr-only">
              {t.askPlaceholder}
            </label>
            <textarea
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.askPlaceholder}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:border-brand-600"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(e);
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-500">
                {t.disclaimer}
              </span>
              <button
                type="submit"
                disabled={loading || question.trim().length < 2}
                className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? t.asking : t.askButton}
              </button>
            </div>
          </form>

          {/* Suggested chips */}
          {suggested.length > 0 && !result && !loading && (
            <div className="mt-5">
              <h2 className="text-sm font-medium text-ink-500 mb-2">
                {t.suggestedHeading}
              </h2>
              <div className="flex flex-wrap gap-2">
                {suggested.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuestion(s);
                      ask(s);
                    }}
                    className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Answer panel */}
        <section aria-live="polite">
          {loading && <SkeletonAnswer label={t.asking} />}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}
          {result && !loading && (
            <AnswerPanel result={result} t={t} onAsk={ask} />
          )}
          {!result && !loading && !error && (
            <p className="text-ink-500 text-sm">{t.emptyAnswerHint}</p>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-4">
        <div className="mx-auto max-w-3xl px-4 flex items-center justify-between text-xs text-ink-500">
          <span>© {new Date().getFullYear()} InfoAI.LK</span>
          <a href="/admin" className="hover:text-brand-700">
            {t.officerLogin}
          </a>
        </div>
      </footer>
    </div>
  );
}

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
      className="flex rounded-lg bg-brand-700 p-0.5"
    >
      {LANGUAGES.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1.5 text-sm rounded-md transition ${
            lang === l
              ? "bg-white text-brand-800 font-semibold"
              : "text-brand-100 hover:text-white"
          }`}
        >
          {LANGUAGE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}

function SkeletonAnswer({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-ink-500 mb-3">{label}</p>
      <div className="space-y-2 animate-pulse">
        <div className="h-3 rounded bg-slate-200 w-11/12" />
        <div className="h-3 rounded bg-slate-200 w-full" />
        <div className="h-3 rounded bg-slate-200 w-9/12" />
      </div>
    </div>
  );
}

function AnswerPanel({
  result,
  t,
  onAsk,
}: {
  result: AskResponse;
  t: ReturnType<typeof getDictionary>;
  onAsk: (q: string) => void;
}) {
  void onAsk;
  if (!result.answered) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-900">{t.noInfoHeading}</h2>
        <p className="mt-1 text-amber-900">{result.answer}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink-900">{t.answerHeading}</h2>

      {result.autoTranslated && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
          <span aria-hidden>⚠</span>
          {t.autoTranslatedNotice}
        </div>
      )}

      <div className="prose-answer mt-3 text-ink-900">{result.answer}</div>

      {/* Citations — carry the trust story, made visually obvious */}
      {result.citations.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-ink-700 mb-2">
            {t.sourcesHeading}
          </h3>
          <ul className="space-y-2">
            {result.citations.map((c) => (
              <li
                key={c.procedureId}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
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
        </div>
      )}

      <FeedbackThumbs queryId={result.queryId} t={t} />
    </div>
  );
}

function FeedbackThumbs({
  queryId,
  t,
}: {
  queryId: string | null;
  t: ReturnType<typeof getDictionary>;
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
    <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
      <span className="text-sm text-ink-500">{t.feedbackPrompt}</span>
      <button
        onClick={() => vote("up")}
        aria-label="Helpful"
        className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
      >
        👍
      </button>
      <button
        onClick={() => vote("down")}
        aria-label="Not helpful"
        className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
      >
        👎
      </button>
    </div>
  );
}
