"use client";

import { useState } from "react";
import { File, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocViewer } from "@/components/DocViewer";
import { DocChat } from "@/components/DocChat";
import { DocDialogHeader } from "@/components/DocDialogHeader";
import { useT } from "@/lib/i18n/client";

export function DocDialog({
  docKind,
  docId,
  storagePath,
  fileName,
  uploaded,
  uploadedAt,
  context,
}: {
  docKind: "project" | "natjecaj";
  docId: string;
  storagePath: string | null;
  fileName: string;
  uploaded: boolean;
  uploadedAt?: string | null;
  /** Where this document lives — project or tender name. */
  context?: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const canOpen = uploaded && !!storagePath;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!canOpen}
        render={
          <button
            className={
              canOpen
                ? "group flex flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-accent"
                : "flex flex-1 cursor-default items-center gap-3 px-2 py-1.5 text-left"
            }
          >
            <span
              className={
                uploaded
                  ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600"
                  : "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              }
            >
              {uploaded ? <File className="size-4" /> : <X className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={
                  canOpen
                    ? "block truncate text-sm font-medium text-foreground underline-offset-2 group-hover:underline"
                    : "block truncate text-sm"
                }
              >
                {fileName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {uploaded ? t.dokument.klikniPregled : t.dokument.nijeUploadano}
              </span>
            </span>
            {canOpen && (
              <span className="flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition group-hover:border-primary group-hover:text-primary">
                <Eye className="size-3.5" /> {t.common.otvori}
              </span>
            )}
          </button>
        }
      />
      {canOpen && (
        // DialogContent is itself a grid, so the body needs an explicit
        // auto+1fr track — flex-1 did nothing here and left a gap under
        // the header.
        <DialogContent className="grid h-[85vh] max-w-[95vw] grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-[95vw] lg:max-w-6xl">
          {/* Screen readers need a title; the visible header below carries the
              same name plus type, date and origin. */}
          <DialogTitle className="sr-only">{fileName}</DialogTitle>
          <DocDialogHeader
            fileName={fileName}
            storagePath={storagePath!}
            uploadedAt={uploadedAt}
            context={context}
          />
          <div className="grid min-h-0 grid-cols-1 md:grid-cols-[1.4fr_1fr]">
            <div className="min-h-0 border-r">
              <DocViewer storagePath={storagePath!} fileName={fileName} />
            </div>
            <div className="min-h-0">
              <DocChat
                docKind={docKind}
                docId={docId}
                storagePath={storagePath!}
                fileName={fileName}
              />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
