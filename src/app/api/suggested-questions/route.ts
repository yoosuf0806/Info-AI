import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: active suggested-question chips (curated by officers). Falls back to a
// static starter list when none are configured.
const DEFAULT_QUESTIONS = [
  "How do I apply for a new NIC?",
  "I lost my NIC — what should I do?",
  "How do I correct my name on my NIC?",
  "What documents do I need to replace a damaged NIC?",
];

export async function GET() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("suggested_questions")
    .select("id, question_text, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(8);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ questions: DEFAULT_QUESTIONS });
  }
  return NextResponse.json({
    questions: (data as Array<{ question_text: string }>).map(
      (q) => q.question_text,
    ),
  });
}
