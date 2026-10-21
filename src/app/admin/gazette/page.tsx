"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/admin-fetch";

interface GazetteRef {
  id: string;
  source_url: string;
  title: string | null;
  gazette_number: string | null;
  published_date: string | null;
}

interface Candidate {
  id: string;
  category_id: string | null;
  suggested_title: string;
  suggested_body: string;
  suggested_source_department: string | null;
  suggested_fees: string | null;
  suggested_timeline: string | null;
  source_excerpt: string | null;
  relevance: string | null;
  gazette: GazetteRef | null;
}

interface GazetteDoc {
  id: string;
  source_url: string;
  title: string | null;
  gazette_number: string | null;
  status: string;
  error: string | null;
  char_count: number;
  fetched_at: string;
}

interface ScanSummary {
  found: number;
  ingested: number;
  skipped: number;
  errors: number;
  candidates: number;
}

export default function GazettePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [documents, setDocuments] = useState<GazetteDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  const load = async () => {
    const d = await apiJson<{ candidates: Candidate[]; documents: GazetteDoc[] }>(
      "/api/admin/gazette",
    );
    setCandidates(d.candidates ?? []);
    setDocuments(d.documents ?? []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const scan = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const s = await apiJson<ScanSummary>("/api/admin/gazette/scan", {
        method: "POST",
      });
      setNotice(
        `Scan done — ${s.found} PDF link(s) found, ${s.ingested} ingested, ${s.skipped} already seen, ${s.errors} skipped (no text), ${s.candidates} candidate(s) added.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  const ingest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await apiJson<{ candidates: number; error?: string; skipped?: boolean }>(
        "/api/admin/gazette/ingest",
        { method: "POST", body: JSON.stringify({ url: url.trim() }) },
      );
      setNotice(
        r.skipped
          ? "Already ingested."
          : r.error
            ? `Ingested, but: ${r.error}`
            : `Ingested — ${r.candidates} candidate(s) added.`,
      );
      setUrl("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "approve" | "dismiss") => {
    setError(null);
    setNotice(null);
    try {
      const r = await apiJson<{ status: string; procedureId?: string }>(
        `/api/admin/gazette/candidates/${id}`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setNotice(
        r.status === "approved"
          ? "Draft procedure created — verify and publish it under Procedures."
          : "Candidate dismissed.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Gazette Updates</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Candidate updates extracted from government Gazettes. Review each one:
            approving creates a <strong>draft</strong> procedure you verify and
            publish. Nothing reaches citizens automatically.
          </p>
        </div>
        <button
          onClick={scan}
          disabled={busy}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Scan now"}
        </button>
      </div>

      {/* Manual ingest fallback */}
      <form onSubmit={ingest} className="mt-4 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Gazette PDF URL to ingest manually…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Ingest URL
        </button>
      </form>

      {notice && (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Pending candidates */}
      <h2 className="mt-8 text-sm font-semibold text-ink-700">
        Pending review ({candidates.length})
      </h2>
      {candidates.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">
          No candidates awaiting review. Run a scan or ingest a Gazette PDF.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink-900">
                  {c.suggested_title}
                </h3>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => act(c.id, "approve")}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Approve → draft
                  </button>
                  <button
                    onClick={() => act(c.id, "dismiss")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {c.relevance && (
                <p className="mt-1 text-sm text-ink-500">{c.relevance}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                {c.suggested_source_department && (
                  <span>Dept: {c.suggested_source_department}</span>
                )}
                {c.suggested_fees && <span>Fees: {c.suggested_fees}</span>}
                {c.suggested_timeline && <span>Time: {c.suggested_timeline}</span>}
              </div>

              <pre className="prose-answer mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-ink-900">
                {c.suggested_body}
              </pre>

              {c.source_excerpt && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-ink-500">
                    Gazette excerpt
                  </summary>
                  <blockquote className="mt-1 border-l-2 border-slate-300 pl-3 text-ink-700">
                    {c.source_excerpt}
                  </blockquote>
                </details>
              )}

              {c.gazette && (
                <div className="mt-2 text-xs text-ink-500">
                  Source:{" "}
                  <a
                    href={c.gazette.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {c.gazette.title || c.gazette.gazette_number || "Gazette PDF"}
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Recently ingested documents */}
      <h2 className="mt-10 text-sm font-semibold text-ink-700">
        Recently ingested
      </h2>
      {documents.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">Nothing ingested yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2">Gazette</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Chars</th>
                <th className="px-3 py-2">Fetched</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {d.title || d.gazette_number || "PDF"}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        d.status === "extracted"
                          ? "text-brand-700"
                          : d.status === "error"
                            ? "text-amber-700"
                            : "text-ink-500"
                      }
                    >
                      {d.status}
                    </span>
                    {d.error && (
                      <span className="block text-xs text-ink-500">
                        {d.error}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-500">
                    {d.char_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-ink-500">
                    {new Date(d.fetched_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-ink-500">
        Tip: a scheduled job can call the scan automatically — see{" "}
        <code>vercel.json</code> and the <code>CRON_SECRET</code> env var.{" "}
        <Link href="/admin/procedures" className="text-brand-700 hover:underline">
          Go to Procedures
        </Link>{" "}
        to publish approved drafts.
      </p>
    </div>
  );
}
