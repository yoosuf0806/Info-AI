import { createSupabaseAdminClient } from "../supabase/admin";
import { extractText } from "../documents/extract";
import { extractCandidates } from "./extract";
import {
  GAZETTE_INDEX_URL,
  GAZETTE_MAX_PER_SCAN,
} from "../constants";

const UA = "InfoAI.LK gazette ingester (+https://infoai.lk)";

export interface GazetteLink {
  url: string;
  title: string;
  gazetteNumber: string | null;
  publishedDate: string | null;
}

// Pull every PDF link out of the index HTML. Defensive by design: the portal's
// DOM is unknown and may change, so we match any href ending in .pdf and resolve
// it against the index URL, rather than relying on a specific layout.
export function parsePdfLinks(html: string, baseUrl: string): GazetteLink[] {
  const seen = new Set<string>();
  const links: GazetteLink[] = [];
  const re = /href\s*=\s*["']([^"']+?\.pdf(?:\?[^"']*)?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let abs: string;
    try {
      abs = new URL(m[1], baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);
    const name = decodeURIComponent(abs.split("/").pop() || "").replace(
      /\.pdf.*$/i,
      "",
    );
    const num = name.match(/\b(\d{4}[-/]\d{1,2})\b/)?.[1] ?? null;
    links.push({
      url: abs,
      title: name.replace(/[_-]+/g, " ").trim() || "Gazette",
      gazetteNumber: num,
      publishedDate: null,
    });
  }
  return links;
}

async function fetchIndex(indexUrl: string): Promise<GazetteLink[]> {
  const res = await fetch(indexUrl, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Index fetch failed (${res.status})`);
  const html = await res.text();
  return parsePdfLinks(html, indexUrl);
}

async function categoryNames(): Promise<
  { id: string; name: string }[]
> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("categories")
    .select("id, name")
    .eq("is_archived", false);
  return (data as { id: string; name: string }[] | null) ?? [];
}

export interface IngestResult {
  url: string;
  skipped?: boolean;
  error?: string;
  candidates: number;
}

// Download one Gazette PDF, extract its text, store it, and file any citizen-
// facing candidate updates for officer review. Idempotent on source_url.
export async function ingestGazetteUrl(
  link: GazetteLink,
  cats?: { id: string; name: string }[],
): Promise<IngestResult> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("gazette_documents")
    .select("id")
    .eq("source_url", link.url)
    .maybeSingle();
  if (existing) return { url: link.url, skipped: true, candidates: 0 };

  let text = "";
  try {
    const res = await fetch(link.url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`PDF fetch failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    text = await extractText(buf, "pdf");
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch/parse error";
    await admin.from("gazette_documents").insert({
      source_url: link.url,
      title: link.title,
      gazette_number: link.gazetteNumber,
      published_date: link.publishedDate,
      status: "error",
      error: message,
    });
    return { url: link.url, error: message, candidates: 0 };
  }

  // Scanned (image-only) PDFs yield little/no text — record and move on (OCR
  // would be needed, which is out of scope).
  if (text.trim().length < 50) {
    await admin.from("gazette_documents").insert({
      source_url: link.url,
      title: link.title,
      gazette_number: link.gazetteNumber,
      published_date: link.publishedDate,
      status: "error",
      error: "No extractable text (likely a scanned/image PDF).",
    });
    return { url: link.url, error: "no-text", candidates: 0 };
  }

  const { data: doc, error: docErr } = await admin
    .from("gazette_documents")
    .insert({
      source_url: link.url,
      title: link.title,
      gazette_number: link.gazetteNumber,
      published_date: link.publishedDate,
      text_excerpt: text.slice(0, 8000),
      char_count: text.length,
      status: "extracted",
    })
    .select("id")
    .single();
  if (docErr || !doc) {
    return { url: link.url, error: docErr?.message ?? "insert failed", candidates: 0 };
  }
  const gazetteId = (doc as { id: string }).id;

  const categories = cats ?? (await categoryNames());
  const candidates = await extractCandidates(
    text,
    categories.map((c) => c.name),
  );

  if (candidates.length > 0) {
    const rows = candidates.map((c) => ({
      gazette_id: gazetteId,
      category_id:
        categories.find(
          (cat) => cat.name.toLowerCase() === c.category.toLowerCase(),
        )?.id ?? null,
      suggested_title: c.title,
      suggested_body: c.body,
      suggested_source_department: c.source_department || null,
      suggested_fees: c.fees || null,
      suggested_timeline: c.timeline || null,
      source_excerpt: c.source_excerpt || null,
      relevance: c.relevance || null,
    }));
    await admin.from("gazette_candidates").insert(rows);
  }

  return { url: link.url, candidates: candidates.length };
}

export interface ScanSummary {
  indexUrl: string;
  found: number;
  ingested: number;
  skipped: number;
  errors: number;
  candidates: number;
  results: IngestResult[];
}

// Read the index, then ingest up to GAZETTE_MAX_PER_SCAN newly-seen PDFs.
export async function scanGazettes(
  max = GAZETTE_MAX_PER_SCAN,
): Promise<ScanSummary> {
  const links = await fetchIndex(GAZETTE_INDEX_URL);
  const admin = createSupabaseAdminClient();

  // Filter out URLs we've already recorded (ingested or errored).
  const { data: known } = await admin
    .from("gazette_documents")
    .select("source_url");
  const knownSet = new Set(
    ((known as { source_url: string }[] | null) ?? []).map((k) => k.source_url),
  );
  const fresh = links.filter((l) => !knownSet.has(l.url)).slice(0, max);

  const cats = await categoryNames();
  const results: IngestResult[] = [];
  for (const link of fresh) {
    results.push(await ingestGazetteUrl(link, cats));
  }

  return {
    indexUrl: GAZETTE_INDEX_URL,
    found: links.length,
    ingested: results.filter((r) => !r.skipped && !r.error).length,
    skipped: results.filter((r) => r.skipped).length,
    errors: results.filter((r) => r.error).length,
    candidates: results.reduce((n, r) => n + r.candidates, 0),
    results,
  };
}
