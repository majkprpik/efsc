"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getSignedUrl } from "@/app/(app)/doc-actions";
import { DocTypeIcon, docLabel } from "@/components/shared";
import { shortDate } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

/** Download button for the dialog header. Resolves its own signed URL. */
function DownloadButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedUrl(storagePath).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [storagePath]);

  if (!url) {
    return (
      <span className="flex size-7 items-center justify-center text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  }

  return (
    <a
      href={url}
      download={fileName}
      title={t.common.preuzmi}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      <Download className="size-3.5" />
    </a>
  );
}

/**
 * Dialog header: the file's identity and where it came from. The old header
 * showed a green check, which said nothing — the dialog only opens for
 * uploaded documents, so it was always there.
 */
export function DocDialogHeader({
  fileName,
  storagePath,
  uploadedAt,
  context,
}: {
  fileName: string;
  storagePath: string;
  uploadedAt?: string | null;
  context?: string | null;
}) {
  // One line: name, then the metadata trailing after it. A stacked title with a
  // 36px icon cost ~60px of height to say very little.
  const meta = [docLabel(fileName), uploadedAt ? shortDate(uploadedAt) : null, context]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-11 shrink-0 items-center gap-2.5 border-b px-3">
      <DocTypeIcon fileName={fileName} className="size-6 rounded [&_svg]:size-3.5" />
      <span className="shrink-0 truncate text-sm font-semibold tracking-tight">{fileName}</span>
      {meta && (
        <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
          {meta}
        </span>
      )}
      {/* DialogContent's own close button is absolutely positioned at
          top-2 right-2 and is size-7 — it covers the rightmost 36px, so the
          header keeps that corner clear. */}
      <span className="ml-auto flex shrink-0 items-center pr-10">
        <DownloadButton storagePath={storagePath} fileName={fileName} />
      </span>
    </div>
  );
}
