"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { uploadPortalDoc } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";

/** Upload za jednu stavku checkliste. */
export function PortalUploadButton({
  requestId,
  label = "Uploadaj",
  variant = "outline",
}: {
  requestId?: string;
  label?: string;
  variant?: "outline" | "default";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    const fd = new FormData();
    if (requestId) fd.set("requestId", requestId);
    fd.set("file", file);
    start(async () => {
      const res = await uploadPortalDoc(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.status === "issue" && res.note) {
        toast.warning(res.note, { duration: 8000 });
      } else {
        toast.success("Dokument zaprimljen");
      }
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {pending ? "Šaljem…" : label}
      </Button>
    </>
  );
}

/** Dropzone koja pušta AI da sam svrsta dokument. */
export function PortalDropzone() {
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await uploadPortalDoc(fd);
      if (res?.error) toast.error(res.error);
      else if (res?.status === "issue" && res.note)
        toast.warning(res.note, { duration: 8000 });
      else toast.success(`${file.name} zaprimljen`);
    });
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        files.forEach(upload);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
        drag ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach(upload);
          e.target.value = "";
        }}
      />
      {pending ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-6 text-muted-foreground" />
      )}
      <div className="text-sm font-medium">
        Povuci dokumente ovdje ili klikni za odabir
      </div>
      <div className="text-xs text-muted-foreground">
        Ne moraš pogađati kamo spada — sami ćemo ga svrstati.
      </div>
    </div>
  );
}

/** Oznaka rezultata AI provjere. */
export function AiBadge({ status, note }: { status: string | null; note: string | null }) {
  if (!status || status === "unknown" || !note) return null;

  const issue = status === "issue";
  const Icon = issue ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={`mt-1.5 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs ${
        issue
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{note}</span>
    </div>
  );
}
