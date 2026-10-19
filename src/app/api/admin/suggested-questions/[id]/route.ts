import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const PATCH = withOfficer(async (_userId, req: Request, ctx: Ctx) => {
  const b = await readJson<{
    question_text?: string;
    display_order?: number;
    is_active?: boolean;
    category_id?: string | null;
  }>(req);
  const patch: Record<string, unknown> = {};
  if (typeof b.question_text === "string")
    patch.question_text = b.question_text.trim();
  if (typeof b.display_order === "number") patch.display_order = b.display_order;
  if (typeof b.is_active === "boolean") patch.is_active = b.is_active;
  if ("category_id" in b) patch.category_id = b.category_id ?? null;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No changes." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("suggested_questions")
    .update(patch)
    .eq("id", ctx.params.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ question: data });
});

export const DELETE = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("suggested_questions")
    .delete()
    .eq("id", ctx.params.id);
  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
});
