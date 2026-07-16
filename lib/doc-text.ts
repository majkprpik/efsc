import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { docKindFromName, extractText } from "@/lib/extract";

const BUCKET = "orbit-docs";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Extracted plain text for an uploaded document, cached in `document_text`.
 *
 * Cache key is (docKind, docId) — the same polymorphic key doc-chat uses, so
 * the two share a cache. Cache hit returns instantly; miss downloads from
 * Storage, extracts, and upserts. Images have no text (they go through vision
 * elsewhere) so callers that only want text can skip them.
 *
 * Returns "" on any failure — a missing file must never break the caller.
 */
export async function getDocText(
  supabase: Supabase,
  docKind: string,
  docId: string,
  storagePath: string,
  fileName: string,
): Promise<string> {
  const kind = docKindFromName(fileName);
  if (kind === "image") return "";

  const { data: cached } = await supabase
    .from("document_text")
    .select("content")
    .eq("doc_kind", docKind)
    .eq("doc_id", docId)
    .maybeSingle();
  if (cached?.content) return cached.content;

  const { data: file, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !file) return "";

  const buf = Buffer.from(await file.arrayBuffer());
  const text = await extractText(buf, kind);

  await supabase
    .from("document_text")
    .upsert(
      { doc_kind: docKind, doc_id: docId, content: text, char_count: text.length },
      { onConflict: "doc_kind,doc_id" },
    );

  return text;
}
