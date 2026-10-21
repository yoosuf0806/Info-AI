import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { ingestGazetteUrl } from "@/lib/gazette/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Officer: manually ingest a specific Gazette PDF URL (the fallback for when the
// auto-scan can't see it, e.g. a JS-rendered listing). Still files candidates
// into the review queue — never auto-publishes.
export const POST = withOfficer(async (_userId, req: Request) => {
  const body = await readJson<{ url?: string }>(req);
  const url = (body.url || "").trim();
  if (!/^https?:\/\/.+\.pdf(\?.*)?$/i.test(url)) {
    return NextResponse.json(
      { error: "Provide a direct URL to a Gazette PDF." },
      { status: 400 },
    );
  }

  const name = decodeURIComponent(url.split("/").pop() || "").replace(
    /\.pdf.*$/i,
    "",
  );
  const result = await ingestGazetteUrl({
    url,
    title: name.replace(/[_-]+/g, " ").trim() || "Gazette",
    gazetteNumber: name.match(/\b(\d{4}[-/]\d{1,2})\b/)?.[1] ?? null,
    publishedDate: null,
  });
  return NextResponse.json(result);
});
