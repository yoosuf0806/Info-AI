"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/admin-fetch";
import type { Category } from "@/lib/types";

interface ProcedureRow {
  id: string;
  title: string;
  category_id: string | null;
  source_department: string;
  status: "draft" | "published";
  authoring_language: string;
  last_verified_date: string | null;
  updated_at: string;
}

export default function ProceduresPage() {
  const [rows, setRows] = useState<ProcedureRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    const d = await apiJson<{ procedures: ProcedureRow[] }>(
      `/api/admin/procedures?${params.toString()}`,
    );
    setRows(d.procedures);
  };

  useEffect(() => {
    apiJson<{ categories: Category[] }>("/api/admin/categories")
      .then((d) => setCats(d.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category]);

  const catName = (id: string | null) =>
    cats.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Procedures</h1>
        <Link
          href="/admin/procedures/new"
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          + New procedure
        </Link>
      </div>

      <div className="mt-4 flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-500">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Lang</th>
              <th className="px-4 py-2 font-medium">Verified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/procedures/${p.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {p.source_department}
                  </div>
                </td>
                <td className="px-4 py-2">{catName(p.category_id)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-ink-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2 uppercase">{p.authoring_language}</td>
                <td className="px-4 py-2">{p.last_verified_date ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No procedures yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
