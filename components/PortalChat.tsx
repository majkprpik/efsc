"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
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
 * `asTeam` je clientId kad razgovor gleda član tima iz pregleda. Tada se ne
 * priča s AI-em — asistent je tu za klijenta — nego se piše poruka klijentu,
 * potpisana imenom pošiljatelja.
 */
function PortalChatBody({
  onClose,
  asTeam = null,
}: {
  onClose?: () => void;
  asTeam?: string | null;
}) {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const api = asTeam ? `/api/portal-chat?clientId=${asTeam}` : "/api/portal-chat";

  useEffect(() => {
    let active = true;
    fetch(api)
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
  }, [api]);

  useEffect(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
    );
  }, [messages]);

  /** Poruka tima klijentu — ne budi AI, samo sjedne u razgovor s potpisom. */
  async function sendAsTeam(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(api, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? t.portal.chatGreska);
        return;
      }
      const r = await fetch(api).then((x) => x.json());
      if (Array.isArray(r.messages)) setMessages(r.messages);
    } catch {
      toast.error(t.portal.chatGreska);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (asTeam) return sendAsTeam(text);

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
            {asTeam ? t.portal.chatPodnaslovTim : t.portal.chatPodnaslov}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t.portal.chatZatvori}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {asTeam ? t.portal.chatUvodTim : t.portal.chatUvod}
            </p>
            {/* Prijedlozi su klijentova pitanja AI-u; tim ovdje ne pita, nego javlja. */}
            {!asTeam && (
              <div className="flex flex-col gap-2">
                {t.portal.chatPrijedlozi.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="chat-suggestion rounded-md border px-3 py-2 text-left text-sm transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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
          placeholder={asTeam ? t.portal.chatPlaceholderTim : t.portal.chatPlaceholder}
          disabled={busy}
          className="bg-card"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/**
 * Portal je jedan uski stupac, pa chat ne može stalno stajati sa strane kao u
 * Orbitu. Umjesto toga je gumb u kutu koji otvara panel — isti na svim širinama.
 */
export function PortalChat({ asTeam = null }: { asTeam?: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[calc(100vh-8rem)] sm:w-[380px]">
          <div className="chat-panel flex h-full flex-col overflow-hidden border bg-card shadow-xl sm:rounded-xl">
            <PortalChatBody onClose={() => setOpen(false)} asTeam={asTeam} />
          </div>
        </div>
      )}

      <Button
        onClick={() => setOpen((v) => !v)}
        size="lg"
        className="fixed bottom-6 right-6 z-50 h-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-4" /> : <MessageCircle className="size-4" />}
        {open ? t.portal.chatZatvori : t.portal.chatOtvori}
      </Button>
    </>
  );
}
