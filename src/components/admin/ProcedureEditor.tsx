"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/admin-fetch";
import { LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from "@/lib/constants";
import type { Category, Procedure, ProcedureTranslation } from "@/lib/types";

interface Props {
  procedureId?: string; // undefined = creating
}

const EMPTY: Partial<Procedure> = {
  title: "",
  body: "",
  source_department: "",
  fees: "",
  timeline: "",
  authoring_language: "en",
  last_verified_date: "",
  status: "draft",
  category_id: null,
};

export default function ProcedureEditor({ procedureId }: Props) {
  const router = useRouter();
  const isNew = !procedureId;
  const [form, setForm] = useState<Partial<Procedure>>(EMPTY);
  const [cats, setCats] = useState<Category[]>([]);
  const [translations, setTranslations] = useState<
    Record<LanguageCode, string>
  >({ en: "", si: "", ta: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiJson<{ categories: Category[] }>("/api/admin/categories")
      .then((d) => setCats(d.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!procedureId) return;
    apiJson<{ procedure: Procedure; translations: ProcedureTranslation[] }>(
      `/api/admin/procedures/${procedureId}`,
    )
      .then((d) => {
        setForm({
          ...d.procedure,
          fees: d.procedure.fees ?? "",
          timeline: d.procedure.timeline ?? "",
          last_verified_date: d.procedure.last_verified_date ?? "",
        });
        const tr: Record<LanguageCode, string> = { en: "", si: "", ta: "" };
        for (const t of d.translations) tr[t.language] = t.verified_body;
        setTranslations(tr);
      })
      .catch((e) => setError(e.message));
  }, [procedureId]);

  const set = (patch: Partial<Procedure>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = async (status: "draft" | "published") => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const payload = { ...form, status };
    try {
      let id = procedureId;
      if (isNew) {
        const d = await apiJson<{ procedure: Procedure }>(
          "/api/admin/procedures",
          { method: "POST", body: JSON.stringify(payload) },
        );
        id = d.procedure.id;
      } else {
        await apiJson(`/api/admin/procedures/${procedureId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setNotice(
        status === "published"
          ? "Published and embedded into the knowledge base."
          : "Saved as draft.",
      );
      if (isNew && id) {
        router.replace(`/admin/procedures/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  const saveTranslation = async (language: LanguageCode) => {
    if (!procedureId) {
      setError("Save the procedure first, then add verified translations.");
      return;
    }
    setError(null);
    try {
      await apiJson(`/api/admin/procedures/${procedureId}/translations`, {
        method: "PUT",
        body: JSON.stringify({
          language,
          verified_body: translations[language],
        }),
      });
      setNotice(`Verified ${LANGUAGE_LABELS[language]} translation saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save translation.");
    }
  };

  const remove = async () => {
    if (!procedureId || !confirm("Delete this procedure?")) return;
    try {
      await apiJson(`/api/admin/procedures/${procedureId}`, {
        method: "DELETE",
      });
      router.replace("/admin/procedures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">
        {isNew ? "New procedure" : "Edit procedure"}
      </h1>

      {notice && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className={field}
            value={form.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className={field}
              value={form.category_id ?? ""}
              onChange={(e) => set({ category_id: e.target.value || null })}
            >
              <option value="">— None —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Authoring language
            </label>
            <select
              className={field}
              value={form.authoring_language ?? "en"}
              onChange={(e) =>
                set({ authoring_language: e.target.value as LanguageCode })
              }
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Body content</label>
          <textarea
            className={`${field} font-mono text-sm`}
            rows={14}
            value={form.body ?? ""}
            onChange={(e) => set({ body: e.target.value })}
            placeholder="Write the full procedure. Separate sections with blank lines."
          />
          <p className="mt-1 text-xs text-ink-500">
            On publish, this text is chunked and embedded so citizens can find it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Source (department / authority)
            </label>
            <input
              className={field}
              value={form.source_department ?? ""}
              onChange={(e) => set({ source_department: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Last verified date
            </label>
            <input
              type="date"
              className={field}
              value={form.last_verified_date ?? ""}
              onChange={(e) => set({ last_verified_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Government fee(s)
            </label>
            <input
              className={field}
              value={form.fees ?? ""}
              onChange={(e) => set({ fees: e.target.value })}
              placeholder="e.g. Rs. 500 (One Day Service)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Processing time / timeline
            </label>
            <input
              className={field}
              value={form.timeline ?? ""}
              onChange={(e) => set({ timeline: e.target.value })}
              placeholder="e.g. 7–10 working days"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={() => save("published")}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {form.status === "published" ? "Update & re-embed" : "Publish"}
          </button>
          <button
            onClick={() => save("draft")}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-ink-700 hover:bg-white disabled:opacity-50"
          >
            Save as draft
          </button>
          {!isNew && (
            <button
              onClick={remove}
              className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Verified translations */}
      {!isNew && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">Verified translations</h2>
          <p className="text-sm text-ink-500 mt-1">
            Optional. A verified translation overrides auto-translation for that
            language and hides the &ldquo;auto-translated&rdquo; notice.
          </p>
          <div className="mt-4 space-y-5">
            {LANGUAGES.filter((l) => l !== form.authoring_language).map((l) => (
              <div key={l}>
                <label className="block text-sm font-medium mb-1">
                  {LANGUAGE_LABELS[l]}
                </label>
                <textarea
                  className={`${field} text-sm`}
                  rows={5}
                  value={translations[l]}
                  onChange={(e) =>
                    setTranslations((t) => ({ ...t, [l]: e.target.value }))
                  }
                />
                <button
                  onClick={() => saveTranslation(l)}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-1.5 text-sm hover:bg-white"
                >
                  Save {LANGUAGE_LABELS[l]} translation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
