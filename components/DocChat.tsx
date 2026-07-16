"use client";

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

type Msg = { role: "user" | "assistant"; content: string };

export function DocChat({
  docKind,
  docId,
  storagePath,
  fileName,
}: {
  docKind: "project" | "natjecaj";
  docId: string;
  storagePath: string;
  fileName: string;
}) {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    scrollDown();

    try {
      const res = await fetch("/api/doc-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docKind, docId, storagePath, fileName, messages: next }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: t.chat.greska }));
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `⚠ ${err.error ?? t.chat.greska}` };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        scrollDown();
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `⚠ ${(e as Error).message}` };
        return copy;
      });
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <div className="text-sm font-medium">{t.chat.oDokumentu}</div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t.chat.pitajODokumentu.split("{file}")[0]}
              <span className="font-medium text-foreground">{fileName}</span>
              {t.chat.pitajODokumentu.split("{file}")[1]}
            </p>
            <div className="flex flex-col gap-2">
              {t.chat.prijedloziDokument.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm"
                }
              >
                {m.content || (busy ? "…" : "")}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pitaj o dokumentu…"
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
