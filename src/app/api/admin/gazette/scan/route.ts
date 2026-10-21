import { NextResponse } from "next/server";
import { requireOfficer, UnauthorizedError } from "@/lib/supabase/auth";
import { scanGazettes } from "@/lib/gazette/scan";
import { CRON_SECRET } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Gazette PDFs can be large; give the scan room on platforms that allow it.
export const maxDuration = 60;

// Trigger a Gazette scan. Callable two ways:
//   - a scheduled cron (Vercel sends `Authorization: Bearer <CRON_SECRET>`), or
//   - a signed-in officer pressing "Scan now".
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const viaCron = !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;

  if (!viaCron) {
    try {
      await requireOfficer();
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      throw e;
    }
  }

  try {
    const summary = await scanGazettes();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[gazette/scan] error:", e);
    const message = e instanceof Error ? e.message : "Scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
