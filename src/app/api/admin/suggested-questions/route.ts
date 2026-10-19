import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withOfficer(async () => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("suggested_questions")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return NextResponse.json({ questions: data });
});

export const POST = withOfficer(async (_userId, req: Request) => {
  const b = await readJson<{
    question_text?: string;
    category_id?: string | null;
    display_order?: number;
  }>(req);
  if (!b.question_text || !b.question_text.trim()) {
    return NextResponse.json(
      { error: "Question text is required." },
      { status: 400 },
    );
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("suggested_questions")
    .insert({
      question_text: b.question_text.trim(),
      category_id: b.category_id ?? null,
      display_order: b.display_order ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ question: data }, { status: 201 });
});
