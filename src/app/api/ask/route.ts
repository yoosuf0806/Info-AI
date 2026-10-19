import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/rag/answer";
import { isLanguage, DEFAULT_LANGUAGE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: citizen asks a question, gets a cited RAG answer.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { question, language } = (body ?? {}) as {
    question?: unknown;
    language?: unknown;
  };

  if (typeof question !== "string" || question.trim().length < 2) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 },
    );
  }
  if (question.length > 1000) {
    return NextResponse.json(
      { error: "Question is too long." },
      { status: 400 },
    );
  }

  const lang = isLanguage(language) ? language : DEFAULT_LANGUAGE;

  try {
    const result = await answerQuestion(question.trim(), lang);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/ask] error:", err);
    return NextResponse.json(
      { error: "Unable to answer right now. Please try again." },
      { status: 500 },
    );
  }
}
