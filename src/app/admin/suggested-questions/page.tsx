"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/admin-fetch";
import type { Category, SuggestedQuestion } from "@/lib/types";

export default function SuggestedQuestionsPage() {
  const [items, setItems] = useState<SuggestedQuestion[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [text, setText] = useState("");
  const [cat, setCat] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const d = await apiJson<{ questions: SuggestedQuestion[] }>(
      "/api/admin/suggested-questions",
    );
    setItems(d.questions);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
    apiJson<{ categories: Category[] }>("/api/admin/categories")
      .then((d) => setCats(d.categories))
      .catch(() => {});
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await apiJson("/api/admin/suggested-questions", {
        method: "POST",
        body: JSON.stringify({
          question_text: text,
          category_id: cat || null,
          display_order: items.length + 1,
        }),
      });
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const patch = async (id: string, body: Partial<SuggestedQuestion>) => {
    try {
      await apiJson(`/api/admin/suggested-questions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const del = async (id: string) => {
    try {
      await apiJson(`/api/admin/suggested-questions/${id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const catName = (id: string | null) =>
    cats.find((c) => c.id === id)?.name ?? "All categories";

  return (
    <div>
      <h1 className="text-2xl font-bold">Suggested Questions</h1>
      <p className="text-ink-500 mt-1">
        Chips shown to citizens below the question box.
      </p>

      <form onSubmit={add} className="mt-5 flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Question text"
          className="flex-1 min-w-[240px] rounded-lg border border-slate-300 px-3 py-2"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">
          Add
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-2">
        {items.map((q) => (
          <li
            key={q.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <span className="flex-1">{q.question_text}</span>
            <span className="text-xs text-ink-500">{catName(q.category_id)}</span>
            <button
              onClick={() => patch(q.id, { is_active: !q.is_active })}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {q.is_active ? "Active" : "Hidden"}
            </button>
            <button
              onClick={() => del(q.id)}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-ink-500 text-sm">No suggested questions yet.</li>
        )}
      </ul>
    </div>
  );
}
