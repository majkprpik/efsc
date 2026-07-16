"use client";

import { useMemo, useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, Empty, Dot } from "@/components/shared";
import { cp, ini, shortDate, eur } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Mail, Phone } from "lucide-react";
import { EntityChatPanel, EntityChatMobileNote } from "@/components/EntityChat";

export type Klijent = {
  id: string;
  naziv: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  tags: string[];
  folder_path: string | null;
};
export type KlijentProjekt = {
  id: string;
  client_id: string;
  naziv: string;
  status: string;
  color: string;
  rok: string | null;
};
export type KlijentNatjecaj = {
  client_id: string;
  id: string;
  naziv: string;
  status: string;
  rok: string | null;
};
export type KlijentFinancija = {
  id: string;
  client_id: string;
  descr: string;
  amount: number;
  type: string;
  datum: string;
  status: string;
};

export function KlijentiView({
  clients,
  projects,
  natjecaji,
  finances,
  initialId,
}: {
  clients: Klijent[];
  projects: KlijentProjekt[];
  natjecaji: KlijentNatjecaj[];
  finances: KlijentFinancija[];
  initialId?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [tag, setTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId ?? clients[0]?.id);

  const allTags = useMemo(
    () => [...new Set(clients.flatMap((c) => c.tags))].slice(0, 10),
    [clients],
  );

  const filtered = useMemo(
    () => (tag ? clients.filter((c) => c.tags.includes(tag)) : clients),
    [tag, clients],
  );

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const selProjects = selected ? projects.filter((p) => p.client_id === selected.id) : [];
  const selNatjecaji = selected ? natjecaji.filter((n) => n.client_id === selected.id) : [];
  const selFinances = selected ? finances.filter((f) => f.client_id === selected.id) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* LIST */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          <div data-tour="klijent-tags" className="flex flex-wrap gap-1.5 border-b p-3">
            <button data-tour="klijent-tag-svi" onClick={() => setTag(null)}>
              <Badge variant={!tag ? "default" : "outline"} className="cursor-pointer">svi</Badge>
            </button>
            {allTags.map((t, i) => (
              <button key={t} data-tour={`klijent-tag-${i}`} onClick={() => setTag(t)}>
                <Badge variant={tag === t ? "default" : "outline"} className="cursor-pointer">{t}</Badge>
              </button>
            ))}
          </div>
          {filtered.length ? (
            filtered.map((c, i) => {
              const [bg, fg] = cp(c.naziv);
              return (
                <button
                  key={c.id}
                  data-tour={`klijent-row-${i}`}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted/50",
                    c.id === selected?.id && "bg-muted",
                  )}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-medium"
                    style={{ background: bg, color: fg }}
                  >
                    {ini(c.naziv)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.naziv}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.contact ?? "—"}</span>
                  </span>
                  {c.status === "inactive" && (
                    <Badge variant="outline" className="text-muted-foreground">neaktivan</Badge>
                  )}
                </button>
              );
            })
          ) : (
            <Empty>{t.klijenti.prazno}</Empty>
          )}
        </div>

        {/* DETAIL */}
        <div className="min-h-0 overflow-y-auto p-6">
          {selected ? (
            <div className="mx-auto max-w-3xl">
              <div data-tour="klijent-header" className="mb-5 flex items-start gap-4 border-b pb-5">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl text-base font-medium"
                  style={{ background: cp(selected.naziv)[0], color: cp(selected.naziv)[1] }}
                >
                  {ini(selected.naziv)}
                </span>
                <div className="flex-1">
                  <div className="text-2xl font-semibold leading-tight tracking-tight">{selected.naziv}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {selected.contact && <span>{selected.contact}</span>}
                    {selected.email && (
                      <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{selected.email}</span>
                    )}
                    {selected.phone && (
                      <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{selected.phone}</span>
                    )}
                  </div>
                </div>
                <Badge className={selected.status === "active" ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}>
                  {selected.status === "active" ? "aktivan" : "neaktivan"}
                </Badge>
              </div>

              {selected.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}

              <Section tour="klijent-projekti" title={t.klijenti.projektiSekcija}>
                {selProjects.length ? (
                  selProjects.map((p, i) => (
                    <Link key={p.id} href={`/projekti?id=${p.id}`} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50", i > 0 && "border-t")}>
                      <Dot color={p.color} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.naziv}</div>
                        <div className="text-xs text-muted-foreground">Rok: {shortDate(p.rok)}</div>
                      </div>
                      <StatusBadge status={p.status} locale={locale} />
                    </Link>
                  ))
                ) : (
                  <Empty>Nema projekata</Empty>
                )}
              </Section>

              {selNatjecaji.length > 0 && (
                <Section tour="klijent-natjecaji" title={t.klijenti.natjecajiSekcija}>
                  {selNatjecaji.map((n, i) => (
                    <Link key={n.id} href={`/natjecaji?id=${n.id}`} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50", i > 0 && "border-t")}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{n.naziv}</div>
                        <div className="text-xs text-muted-foreground">Rok: {shortDate(n.rok)}</div>
                      </div>
                      <StatusBadge status={n.status} locale={locale} />
                    </Link>
                  ))}
                </Section>
              )}

              {selFinances.length > 0 && (
                <Section tour="klijent-financije" title="Financije">
                  {selFinances.map((f, i) => (
                    <div key={f.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{f.descr}</div>
                        <div className="text-xs text-muted-foreground">{shortDate(f.datum)} · {f.status}</div>
                      </div>
                      <div className={cn("text-sm font-medium", f.type === "inc" ? "text-emerald-600" : "text-red-600")}>
                        {f.type === "inc" ? "+" : "−"}{eur(f.amount)} EUR
                      </div>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              Odaberi klijenta
            </div>
          )}
        </div>
      </div>
      {selected && (
        <EntityChatPanel entityKind="klijent" entityId={selected.id} title={selected.naziv} />
      )}
      <EntityChatMobileNote />
    </div>
  );
}

function Section({
  title,
  children,
  tour,
}: {
  title: string;
  children: React.ReactNode;
  tour?: string;
}) {
  return (
    <div data-tour={tour} className="mb-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}
