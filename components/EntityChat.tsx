"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS: Record<string, string[]> = {
  natjecaj: ["Sažmi ovaj natječaj", "Koji su ključni rokovi?", "Koji klijenti su prijavljeni?"],
  klijent: ["Sažmi status klijenta", "Koji projekti su u tijeku?", "Ima li dospjelih računa?"],
  potencijalni: ["Sažmi ovu priliku", "Koji natječaj je najbolji za njih?", "Predloži sljedeći korak"],
  projekt: ["Što još fali u dokumentaciji?", "Sažmi status projekta", "Koji su otvoreni zadaci?"],
  financije: ["Sažmi financije", "Tko kasni s plaćanjem?", "Koliko je ukupno naplaćeno?"],
};

export function EntityChat({
  entityKind,
  entityId,
  title,
}: {
  entityKind: string;
  entityId: string | null;
  title: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load stored history when the entity changes
  useEffect(() => {
    let active = true;
    setInput("");
    setMessages([]);
    setLoaded(false);
    const params = new URLSearchParams({ entityKind });
    if (entityId) params.set("entityId", entityId);
    fetch(`/api/entity-chat?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.messages)) setMessages(d.messages);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [entityId, entityKind]);

  const scrollDown = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  };

  useEffect(() => {
    scrollDown();
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/entity-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityKind, entityId, message: question }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Greška." }));
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: `⚠ ${err.error ?? "Greška."}` };
          return c;
        });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc };
          return c;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: `⚠ ${(e as Error).message}` };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  const suggestions = SUGGESTIONS[entityKind] ?? ["Sažmi ovo", "Što je najvažnije?"];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">AI asistent</div>
          <div className="truncate text-xs text-muted-foreground">{title}</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pitaj bilo što o ovoj stavci.</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
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
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pitaj AI…" disabled={busy} />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/**
 * Side panel with the AI assistant. Always open on desktop (md+).
 * On mobile there's no room for a split view, so we show a short
 * "still in progress — open on desktop" note instead.
 */
export function EntityChatPanel(props: {
  entityKind: string;
  entityId: string | null;
  title: string;
}) {
  return (
    <div className="hidden w-[360px] min-w-0 shrink-0 flex-col border-l md:flex">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Razgovor</span>
      </div>
      <div className="min-h-0 flex-1">
        <EntityChat {...props} />
      </div>
    </div>
  );
}

/** Mobile-only note shown where the AI panel would be on desktop. */
export function EntityChatMobileNote() {
  return (
    <div className="flex items-center justify-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground md:hidden">
      <Sparkles className="size-3.5" />
      AI asistent — još u izradi, otvori na desktopu.
    </div>
  );
}
