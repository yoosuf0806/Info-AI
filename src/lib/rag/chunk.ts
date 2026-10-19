// Split procedure text into overlapping chunks for embedding.
// Paragraph-aware, with a soft character budget and small overlap so context
// isn't lost across chunk boundaries.

const MAX_CHARS = 1200;
const OVERLAP_CHARS = 150;

export function chunkText(input: string): string[] {
  const text = (input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const para of paragraphs) {
    // A single paragraph longer than the budget: hard-split it.
    if (para.length > MAX_CHARS) {
      flush();
      for (let i = 0; i < para.length; i += MAX_CHARS - OVERLAP_CHARS) {
        chunks.push(para.slice(i, i + MAX_CHARS).trim());
      }
      continue;
    }
    if ((current + "\n\n" + para).length > MAX_CHARS) {
      flush();
    }
    current = current ? current + "\n\n" + para : para;
  }
  flush();

  return chunks;
}
