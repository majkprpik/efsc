"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { getSignedUrl, getDocPreview, type DocPreview } from "@/app/(app)/doc-actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

type Kind = "pdf" | "docx" | "xlsx" | "image" | "text" | "other";

function kindOf(name: string): Kind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (["txt", "csv", "md", "log", "json", "xml", "yml", "yaml"].includes(ext)) return "text";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

export function DocViewer({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocPreview | null>(null);
  const kind = kindOf(fileName);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTextContent(null);
    setPreview(null);
    getSignedUrl(storagePath).then(async (u) => {
      if (!active) return;
      setUrl(u);
      // Text files: fetch the content and render inline
      if (u && kind === "text") {
        try {
          const res = await fetch(u);
          const txt = await res.text();
          if (active) setTextContent(txt);
        } catch {
          if (active) setTextContent(null);
        }
      }
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [storagePath, kind]);

  // docx/xlsx have no native browser preview, so the server renders them.
  useEffect(() => {
    if (kind !== "docx" && kind !== "xlsx") return;
    let active = true;
    getDocPreview(storagePath, fileName).then((p) => {
      if (active) setPreview(p);
    });
    return () => {
      active = false;
    };
  }, [storagePath, fileName, kind]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t.dokument.neMoguUcitati}
      </div>
    );
  }

  if (kind === "pdf") {
    return <iframe src={url} className="h-full w-full border-0" title={fileName} />;
  }

  if (kind === "image") {
    return (
      <div className="flex h-full items-center justify-center overflow-auto bg-muted/30 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className="h-full overflow-auto bg-muted/20 p-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
          {textContent ?? t.dokument.praznaDatoteka}
        </pre>
      </div>
    );
  }

  if (kind === "docx" || kind === "xlsx") {
    if (!preview) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      );
    }

    if (preview.kind === "html") {
      return (
        <div className="h-full overflow-auto bg-muted/20 p-6">
          <div
            className="doc-prose mx-auto max-w-2xl rounded-lg bg-card p-8 shadow-sm"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>
      );
    }

    if (preview.kind === "sheets") {
      return (
        <div className="h-full overflow-auto bg-muted/20 p-4">
          {preview.sheets.map((s) => (
            <div key={s.name} className="mb-6">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.name}
              </div>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {s.rows.map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? "bg-muted/50 font-medium" : ""}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="border-b border-r px-2.5 py-1.5 last:border-r-0"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // Anything else (or a preview that failed) → download
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileText className="size-12 text-muted-foreground/40" />
      <div className="text-sm text-muted-foreground">
        {preview?.kind === "error"
          ? `${t.dokument.pregledNijeUspio}: ${preview.message}`
          : t.dokument.nemaPregleda}
        <br />
        {t.dokument.ispitajKrozAi}
      </div>
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={url} download={fileName}>
            <Download className="size-4" /> {t.common.preuzmi} {fileName}
          </a>
        }
      />
    </div>
  );
}
