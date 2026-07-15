"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/app/(app)/projekti/actions";
import { Button } from "@/components/ui/button";

/** Upload button for a single checklist row (docId) or a new doc (projectId only). */
export function DocUploadButton({
  projectId,
  docId,
  label = "Dodaj",
}: {
  projectId: string;
  docId?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    if (docId) fd.set("docId", docId);
    fd.set("file", file);
    start(async () => {
      const res = await uploadDocument(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Dokument uploadan ✓");
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {label}
      </Button>
    </>
  );
}

/** Dropzone for adding new documents to a project. */
export function DocDropzone({ projectId }: { projectId: string }) {
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("file", file);
    start(async () => {
      const res = await uploadDocument(fd);
      if (res?.error) toast.error(res.error);
      else toast.success(`${file.name} uploadan ✓`);
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
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed p-5 text-center transition ${
        drag ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {pending ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-5 text-muted-foreground" />
      )}
      <div className="text-sm text-muted-foreground">
        Povuci datoteku ili <span className="text-primary">klikni za upload</span>
      </div>
    </div>
  );
}
