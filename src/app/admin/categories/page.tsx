"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/admin-fetch";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await apiJson<{ categories: Category[] }>("/api/admin/categories");
    setItems(d.categories);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiJson("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name, display_order: items.length + 1 }),
      });
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Partial<Category>) => {
    setError(null);
    try {
      await apiJson(`/api/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = items[index + dir];
    const cur = items[index];
    if (!target) return;
    patch(cur.id, { display_order: target.display_order });
    patch(target.id, { display_order: cur.display_order });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <p className="text-ink-500 mt-1">
        Add, rename, reorder, and archive categories.
      </p>

      <form onSubmit={add} className="mt-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-2">
        {items.map((c, i) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              c.is_archived
                ? "border-slate-200 bg-slate-50 opacity-60"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-ink-500 disabled:opacity-30"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="text-ink-500 disabled:opacity-30"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <input
              defaultValue={c.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== c.name)
                  patch(c.id, { name: e.target.value.trim() });
              }}
              className="flex-1 rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-brand-600"
            />
            {c.is_archived && (
              <span className="text-xs text-ink-500">archived</span>
            )}
            <button
              onClick={() => patch(c.id, { is_archived: !c.is_archived })}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {c.is_archived ? "Restore" : "Archive"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
