import { GoogleGenAI } from "@google/genai";

// Server-only Gemini client. The API key never leaves the server.
let cached: GoogleGenAI | null = null;

export function getGemini() {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
