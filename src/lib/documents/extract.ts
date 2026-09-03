// Server-only text extraction from uploaded official documents.
// PDF via pdf-parse, DOCX via mammoth. Returns plain text an officer can review
// and attach to a procedure.

export async function extractText(
  buffer: Buffer,
  fileType: string,
): Promise<string> {
  const type = fileType.toLowerCase();
  if (type === "pdf" || type === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return (result.text || "").trim();
  }
  if (
    type === "docx" ||
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }
  throw new Error(`Unsupported file type for text extraction: ${fileType}`);
}

export function fileTypeFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  return null;
}
