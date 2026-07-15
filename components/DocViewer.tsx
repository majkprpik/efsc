"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { getSignedUrl } from "@/app/(app)/doc-actions";
import { Button } from "@/components/ui/button";

type Kind = "pdf" | "docx" | "xlsx" | "image" | "other";

function kindOf(name: string): Kind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

export function DocViewer({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const kind = kindOf(fileName);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSignedUrl(storagePath).then((u) => {
      if (active) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [storagePath]);

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
        Ne mogu učitati dokument.
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

  // docx / xlsx / other → no native preview; offer download + note
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileText className="size-12 text-muted-foreground/40" />
      <div className="text-sm text-muted-foreground">
        Za ovaj tip dokumenta nema pregleda u browseru.
        <br />
        Sadržaj možeš ispitati kroz AI chat desno ili preuzeti datoteku.
      </div>
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={url} download={fileName}>
            <Download className="size-4" /> Preuzmi {fileName}
          </a>
        }
      />
    </div>
  );
}
