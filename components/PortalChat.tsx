"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

type Msg = {
  role: "user" | "assistant";
  content: string;
  author_kind?: string | null;
  author_name?: string | null;
};

/**
 * AI pomoć za klijenta na portalu.
 *
 * Odvojeno od EntityChata iako izgleda slično: taj gađa /api/entity-chat, koji
 * klijentima vraća 401, i nosi prijedloge po tipu entiteta koji ovdje ne postoje.
 *
 * `preview` je true u timskom pregledu (/portal-admin/pregled): chat izgleda
 * točno kao klijentov, ali je neaktivan — ne dohvaća razgovor niti šalje poruke.
 * Pregled je prozor za gledanje, ne mjesto s kojeg tim piše klijentu.
 */
function PortalChatBody({ preview = false }: { preview?: boolean }) {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(preview);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) return;
    let active = true;
    fetch("/api/portal-chat")
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
  }, [preview]);

  useEffect(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
    );
  }, [messages]);

  async function send(text: string) {
    if (preview) return;

    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setBusy(true);

    const fail = (msg: string) =>
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: `⚠ ${msg}` };
        return c;
      });

    try {
      const res = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        fail(err.error ?? t.portal.chatGreska);
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
    } catch {
      fail(t.portal.chatGreska);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="chat-header flex items-center gap-2.5 border-b px-4 py-3">
        <span className="chat-mark flex size-7 shrink-0 items-center justify-center rounded-md">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{t.portal.chatNaslov}</div>
          <div className="truncate text-xs text-muted-foreground">
            {t.portal.chatPodnaslov}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.portal.chatUvod}</p>
            {/* Prijedlozi su klijentova pitanja AI-u. U pregledu su tu radi
                vjernog izgleda, ali su neaktivni kao i ostatak chata. */}
            <div className="flex flex-col gap-2">
              {t.portal.chatPrijedlozi.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={preview}
                  className="chat-suggestion rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-default disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={m.role === "user" ? "max-w-[85%]" : "max-w-[85%]"}>
                {m.author_kind === "team" && (
                  <div className="mb-0.5 text-right text-[11px] text-muted-foreground">
                    {m.author_name
                      ? t.portal.chatOdTima.replace("{name}", m.author_name)
                      : t.portal.chatOdTimaBezImena}
                  </div>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "chat-bubble-user rounded-lg px-3 py-2 text-sm"
                      : "chat-bubble-ai whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm"
                  }
                >
                  {m.content || (busy ? "…" : "")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="chat-composer flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.portal.chatPlaceholder}
          disabled={busy || preview}
          className="bg-card"
        />
        <Button type="submit" size="icon" disabled={busy || preview || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/**
 * Pomoć stoji stalno sa strane, kao AI panel na Orbitovim stranicama — nije
 * skočni prozor. Na mobitelu nema mjesta za split pa ide kratka napomena.
 */
export function PortalChatPanel({ preview = false }: { preview?: boolean }) {
  return (
    <div className="chat-panel hidden min-h-0 w-[360px] min-w-0 shrink-0 flex-col border-l md:flex">
      <PortalChatBody preview={preview} />
    </div>
  );
}

/** Napomena na mobitelu, ondje gdje bi na desktopu bio panel pomoći. */
export function PortalChatMobileNote() {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground md:hidden">
      <Sparkles className="size-3.5" />
      {t.portal.chatPodnaslov}
    </div>
  );
}
