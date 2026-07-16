"use server";

import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

const BUCKET = "orbit-docs";

/** Mint a short-lived signed URL for previewing/downloading a private doc. */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

export type DocPreview =
  | { kind: "html"; html: string }
  | { kind: "sheets"; sheets: { name: string; rows: string[][] }[] }
  | { kind: "error"; message: string };

/**
 * Mammoth escapes document *text*, but it emits real <a href> and <img src>
 * from the file's own links — and this HTML is injected into the page. A
 * document is untrusted input, so strip anything that can execute.
 */
function sanitize(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "")
    // inline event handlers: onclick=, onerror=, …
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // javascript:/vbscript:/data: URLs in href or src
    .replace(
      /\s(href|src)\s*=\s*("|')?\s*(javascript|vbscript|data)\s*:[^"'>\s]*("|')?/gi,
      ' $1="#"',
    );
}

/**
 * Render docx/xlsx to previewable markup. The browser can't display either
 * natively, but mammoth and xlsx are already here for the AI chat — so the
 * content was always readable, just never shown.
 */
export async function getDocPreview(storagePath: string, fileName: string): Promise<DocPreview> {
  const t = await getT();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    return { kind: "error", message: error?.message ?? t.dokument.neMoguDohvatiti };
  }
  const buf = Buffer.from(await data.arrayBuffer());

  try {
    if (ext === "docx" || ext === "doc") {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.convertToHtml({ buffer: buf });
      return { kind: "html", html: sanitize(value) };
    }
    if (ext === "xlsx" || ext === "xls") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
          header: 1,
          blankrows: false,
          defval: "",
          raw: false,
        }),
      }));
      return { kind: "sheets", sheets };
    }
  } catch (e) {
    return { kind: "error", message: (e as Error).message };
  }

  return { kind: "error", message: t.dokument.nepodrzanTip };
}
