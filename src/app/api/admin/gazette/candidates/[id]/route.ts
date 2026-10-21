import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Officer: act on a review-queue candidate.
//   - approve → create a DRAFT procedure from the suggestion (the officer then
//     verifies and publishes it through the normal flow, which embeds it).
//   - dismiss → mark the candidate dismissed.
// Nothing here publishes anything to citizens.
export const POST = withOfficer(
  async (userId, req: Request, ctx: { params: { id: string } }) => {
    const { id } = ctx.params;
    const body = await readJson<{ action?: "approve" | "dismiss" }>(req);
    const action = body.action;
    if (action !== "approve" && action !== "dismiss") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'dismiss'." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: cand, error: candErr } = await admin
      .from("gazette_candidates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (candErr) throw new Error(candErr.message);
    if (!cand) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const c = cand as {
      status: string;
      category_id: string | null;
      suggested_title: string;
      suggested_body: string;
      suggested_source_department: string | null;
      suggested_fees: string | null;
      suggested_timeline: string | null;
    };
    if (c.status !== "pending") {
      return NextResponse.json(
        { error: "This candidate has already been reviewed." },
        { status: 409 },
      );
    }

    if (action === "dismiss") {
      await admin
        .from("gazette_candidates")
        .update({ status: "dismissed", reviewed_by: userId })
        .eq("id", id);
      return NextResponse.json({ ok: true, status: "dismissed" });
    }

    // approve → create a draft procedure (unpublished, unembedded).
    const { data: proc, error: procErr } = await admin
      .from("procedures")
      .insert({
        category_id: c.category_id,
        title: c.suggested_title,
        body: c.suggested_body,
        source_department: c.suggested_source_department ?? "",
        fees: c.suggested_fees,
        timeline: c.suggested_timeline,
        authoring_language: "en",
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();
    if (procErr || !proc) {
      throw new Error(procErr?.message ?? "Could not create draft procedure.");
    }
    const procedureId = (proc as { id: string }).id;

    await admin
      .from("gazette_candidates")
      .update({
        status: "approved",
        reviewed_by: userId,
        procedure_id: procedureId,
      })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      status: "approved",
      procedureId,
    });
  },
);
