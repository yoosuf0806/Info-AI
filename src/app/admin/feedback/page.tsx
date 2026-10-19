"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/admin-fetch";

interface QueryRow {
  id: string;
  question_text: string;
  language: string;
  answered: boolean;
  feedback: "up" | "down" | null;
  created_at: string;
}

const TABS = [
  { key: "down", label: "👎 Answers" },
  { key: "unanswered", label: "Unanswered (content gaps)" },
  { key: "", label: "All recent" },
] as const;

export default function FeedbackPage() {
  const [tab, setTab] = useState<string>("down");
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = tab ? `?filter=${tab}` : "";
    apiJson<{ queries: QueryRow[] }>(`/api/admin/queries${params}`)
      .then((d) => setRows(d.queries))
      .catch((e) => setError(e.message));
  }, [tab]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Feedback & Insights</h1>
      <p className="text-ink-500 mt-1">
        Anonymous citizen questions. Use 👎 answers and unanswered questions to
        find content that needs writing or fixing.
      </p>

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-ink-700 hover:bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-500">
            <tr>
              <th className="px-4 py-2 font-medium">Question</th>
              <th className="px-4 py-2 font-medium">Lang</th>
              <th className="px-4 py-2 font-medium">Answered</th>
              <th className="px-4 py-2 font-medium">Feedback</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{r.question_text}</td>
                <td className="px-4 py-2 uppercase">{r.language}</td>
                <td className="px-4 py-2">
                  {r.answered ? "Yes" : <span className="text-amber-700">No</span>}
                </td>
                <td className="px-4 py-2">
                  {r.feedback === "down" ? "👎" : r.feedback === "up" ? "👍" : "—"}
                </td>
                <td className="px-4 py-2 text-ink-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
