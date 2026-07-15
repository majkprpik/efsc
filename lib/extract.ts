import "server-only";

export type DocKind = "pdf" | "docx" | "xlsx" | "image" | "other";

export function docKindFromName(name: string): DocKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

/** Extract plain text from a document buffer. Images return "" (handled via vision). */
export async function extractText(buf: Buffer, kind: DocKind): Promise<string> {
  try {
    if (kind === "pdf") {
      const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await pdfExtract(pdf, { mergePages: true });
      return Array.isArray(text) ? (text as string[]).join("\n") : (text as string);
    }
    if (kind === "docx") {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return value;
    }
    if (kind === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      return wb.SheetNames.map((n) => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[n]);
        return `# List: ${n}\n${csv}`;
      }).join("\n\n");
    }
  } catch (e) {
    return `[Greška pri čitanju dokumenta: ${(e as Error).message}]`;
  }
  return "";
}
