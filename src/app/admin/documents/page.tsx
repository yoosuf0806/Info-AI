"use client";

import { useEffect, useRef, useState } from "react";
import { apiJson, apiForm } from "@/lib/admin-fetch";
import type { Category, DocumentRecord } from "@/lib/types";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploadCat, setUploadCat] = useState("");

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (showArchived) params.set("archived", "true");
    const d = await apiJson<{ documents: DocumentRecord[] }>(
      `/api/admin/documents?${params.toString()}`,
    );
    setDocs(d.documents);
  };

  useEffect(() => {
    apiJson<{ categories: Category[] }>("/api/admin/categories")
      .then((d) => setCats(d.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, showArchived]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or DOCX file.");
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    setExtracted(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title || file.name);
      if (uploadCat) form.set("category_id", uploadCat);
      const d = await apiForm<{ document: DocumentRecord; extractedText: string }>(
        "/api/admin/documents",
        form,
      );
      setNotice(`Uploaded "${d.document.title}".`);
      setExtracted(d.extractedText || "(No text could be extracted.)");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const toggleArchive = async (doc: DocumentRecord) => {
    try {
      await apiJson(`/api/admin/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: !doc.is_archived }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const download = async (id: string) => {
    try {
      const d = await apiJson<{ downloadUrl: string | null }>(
        `/api/admin/documents/${id}`,
      );
      if (d.downloadUrl) window.open(d.downloadUrl, "_blank");
      else setError("No download URL available.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const catName = (id: string | null) =>
    cats.find((c) => c.id === id)?.name ?? "—";
  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl font-bold">Documents</h1>
      <p className="text-ink-500 mt-1">
        Upload official circulars/gazettes (PDF, DOCX). Text is extracted for use
        in procedures; the original is versioned and stored securely.
      </p>

      {/* Upload */}
      <form
        onSubmit={upload}
        className="mt-5 rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className={field}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className={field}
          />
          <select
            value={uploadCat}
            onChange={(e) => setUploadCat(e.target.value)}
            className={field}
          >
            <option value="">Category (optional)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={uploading}
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload & extract"}
        </button>
      </form>

      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {extracted && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Extracted text</h2>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(extracted);
                setNotice("Copied. Paste into a procedure body.");
              }}
              className="text-sm text-brand-700 hover:underline"
            >
              Copy
            </button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-ink-700">
            {extracted}
          </pre>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title…"
          className={field}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={field}
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {/* List */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-500">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Ver.</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{d.title}</td>
                <td className="px-4 py-2">{catName(d.category_id)}</td>
                <td className="px-4 py-2 uppercase">{d.file_type}</td>
                <td className="px-4 py-2">v{d.version}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => download(d.id)}
                      className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => toggleArchive(d)}
                      className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                    >
                      {d.is_archived ? "Restore" : "Archive"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No documents.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
