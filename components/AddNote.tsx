"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createNote } from "@/app/(app)/potencijalni/actions";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/ProfileContext";
import { useT } from "@/lib/i18n/client";

export function AddNoteForm({ clientId }: { clientId: string }) {
  const t = useT();
  const profile = useProfile();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("text", trimmed);
    start(async () => {
      const res = await createNote(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setText("");
      toast.success(t.potencijalni.biljeskaDodana);
      taRef.current?.focus();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-row-reverse items-start gap-2.5 border-t pt-3"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-medium text-primary">
        {profile?.initials ?? "?"}
      </span>
      <div className="flex flex-1 flex-col items-end gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={t.potencijalni.novaBiljeska}
          className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {t.potencijalni.dodajBiljesku}
        </Button>
      </div>
    </form>
  );
}
