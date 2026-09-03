import { getGemini } from "./client";
import { GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_DIM } from "../constants";

// gemini-embedding-001 supports Matryoshka truncation to 768/1536/3072 dims.
// Below 3072 the output is NOT normalized by the API, so we L2-normalize here —
// this keeps cosine distance well-behaved for pgvector search.
function l2normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

async function embed(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[]> {
  const ai = getGemini();
  const res = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: GEMINI_EMBEDDING_DIM,
    },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini returned an empty embedding.");
  }
  return l2normalize(values);
}

// Embed a stored procedure chunk (indexing side).
export function embedDocument(text: string) {
  return embed(text, "RETRIEVAL_DOCUMENT");
}

// Embed a citizen's question (query side).
export function embedQuery(text: string) {
  return embed(text, "RETRIEVAL_QUERY");
}
