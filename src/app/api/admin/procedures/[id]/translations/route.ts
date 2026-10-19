import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLanguage } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// Upsert an officer-verified translation for a procedure/language. An empty
// verified_body deletes the override (falls back to auto-translation).
export const PUT = withOfficer(async (_userId, req: Request, ctx: Ctx) => {
  const b = await readJson<{ language?: string; verified_body?: string }>(req);
  if (!isLanguage(b.language)) {
    return NextResponse.json(
      { error: "Valid language is required." },
      { status: 400 },
    );
  }
  const admin = createSupabaseAdminClient();

  if (!b.verified_body || !b.verified_body.trim()) {
    await admin
      .from("procedure_translations")
      .delete()
      .eq("procedure_id", ctx.params.id)
      .eq("language", b.language);
    return NextResponse.json({ ok: true, removed: true });
  }

  const { data, error } = await admin
    .from("procedure_translations")
    .upsert(
      {
        procedure_id: ctx.params.id,
        language: b.language,
        verified_body: b.verified_body.trim(),
      },
      { onConflict: "procedure_id,language" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ translation: data });
});
