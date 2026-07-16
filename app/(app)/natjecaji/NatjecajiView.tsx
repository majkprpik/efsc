"use client";

import { useMemo, useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import { plural } from "@/lib/i18n/dictionaries";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, Empty, Dot } from "@/components/shared";
import { shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Trophy, Globe, MessagesSquare, RefreshCw, ExternalLink, CalendarClock } from "lucide-react";
import { DocDialog } from "@/components/DocDialog";
import { DocDropzone } from "@/components/DocUpload";
import { EntityChatPanel, EntityChatMobileNote } from "@/components/EntityChat";
import { nalaziZaNatjecaj, brojNovih, pomakRoka, type Nalaz } from "@/lib/demo-nalazi";

export type Natjecaj = {
  id: string;
  naziv: string;
  status: string;
  rok: string | null;
  tijelo: string | null;
  iznos: string | null;
  sufinanciranje: string | null;
  tags: string[];
  folder_path: string;
  nat_folder_path: string;
};
export type ProjRow = {
  id: string;
  natjecaj_id: string | null;
  naziv: string;
  progress: number;
  color: string;
  status: string;
  clientNaziv: string | null;
};
export type NatDoc = { id: string; natjecaj_id: string; filename: string; storage_path: string | null };

const FILTERS = [
  { key: "svi", label: "svi" },
  { key: "aktivan", label: "aktivni" },
  { key: "zatvoren", label: "zatvoreni" },
  { key: "arhiva", label: "arhiva" },
] as const;

export function NatjecajiView({
  natjecaji,
  projects,
  docs,
}: {
  natjecaji: Natjecaj[];
  projects: ProjRow[];
  docs: NatDoc[];
}) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<string>("svi");
  const [selectedId, setSelectedId] = useState<string | undefined>(natjecaji[0]?.id);

  const filtered = useMemo(
    () => (filter === "svi" ? natjecaji : natjecaji.filter((n) => n.status === filter)),
    [filter, natjecaji],
  );

  // keep selection valid within current filter
  const selected =
    filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  const clientCount = (natjecajId: string) =>
    new Set(projects.filter((p) => p.natjecaj_id === natjecajId).map((p) => p.clientNaziv)).size;

  const selectedProjects = selected
    ? projects.filter((p) => p.natjecaj_id === selected.id)
    : [];
  const selectedDocs = selected ? docs.filter((d) => d.natjecaj_id === selected.id) : [];

  const nalazi = useMemo(
    () => (selected ? nalaziZaNatjecaj(selected.id, selected.status) : []),
    [selected],
  );
  const noviRok = pomakRoka(nalazi);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
    <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] overflow-hidden">
      {/* LIST */}
      <div className="flex min-h-0 flex-col overflow-y-auto border-r">
        <div data-tour="nat-filters" className="flex flex-wrap gap-1.5 border-b p-3">
          {FILTERS.map((f) => (
            <button key={f.key} data-tour={`nat-filter-${f.key}`} onClick={() => setFilter(f.key)}>
              <Badge variant={filter === f.key ? "default" : "outline"} className="cursor-pointer">
                {f.label}
              </Badge>
            </button>
          ))}
        </div>
        {filtered.length ? (
          filtered.map((n, i) => (
            <button
              key={n.id}
              data-tour={`nat-row-${i}`}
              onClick={() => setSelectedId(n.id)}
              className={cn(
                "flex items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted/50",
                n.id === selected?.id && "bg-muted",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Trophy className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n.naziv}</span>
                <span className="block text-xs text-muted-foreground">
                  {clientCount(n.id)} {t.natjecaji.kratica.klijenata} · {shortDate(n.rok)}
                </span>
              </span>
              <StatusBadge status={n.status} locale={locale} />
            </button>
          ))
        ) : (
          <Empty>{t.natjecaji.prazno}</Empty>
        )}
      </div>

      {/* DETAIL */}
      <div className="min-h-0 overflow-y-auto p-6">
        {selected ? (
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-start gap-4 border-b pb-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Trophy className="size-6" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-semibold leading-tight tracking-tight">{selected.naziv}</div>
                <div data-tour="nat-meta" className="mt-1 text-sm text-muted-foreground">
                  {[
                    selected.tijelo,
                    selected.iznos,
                    selected.sufinanciranje && `${selected.sufinanciranje} ${t.natjecaji.sufinanciranje}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <StatusBadge status={selected.status} locale={locale} />
            </div>

            <div data-tour="nat-info" className="mb-5 grid grid-cols-3 gap-3">
              <Info
                label={t.natjecaji.rokPrijave}
                value={shortDate(selected.rok)}
                accent={selected.status === "aktivan"}
                note={noviRok && `${t.natjecaji.izvori.izvorJavlja} ${noviRok.noviRok}`}
              />
              <Info label={t.natjecaji.klijenata} value={String(clientCount(selected.id))} />
              <Info label={t.natjecaji.projekata} value={String(selectedProjects.length)} />
            </div>

            <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.natjecaji.dokumentiNatjecaja}
            </div>
            <Card>
              <CardContent className="p-0">
                {selectedDocs.length ? (
                  selectedDocs.map((d, i) => (
                    <div key={d.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}>
                      <DocDialog
                        docKind="natjecaj"
                        docId={d.id}
                        storagePath={d.storage_path}
                        fileName={d.filename}
                        uploaded={!!d.storage_path}
                        context={selected.naziv}
                      />
                    </div>
                  ))
                ) : (
                  <Empty>{t.projekti.nemaDokumenata}</Empty>
                )}
                <div className="p-3">
                  <DocDropzone docKind="natjecaj" natjecajId={selected.id} />
                </div>
              </CardContent>
            </Card>

            {selectedProjects.length > 0 && (
              <>
                <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.projekti.podNatjecajem}
                </div>
                <Card>
                  <CardContent className="p-0">
                    {selectedProjects.map((p, i) => (
                      <Link
                        key={p.id}
                        href={`/projekti?id=${p.id}`}
                        className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/50", i > 0 && "border-t")}
                      >
                        <Dot color={p.color} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{p.naziv}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.clientNaziv ?? "—"}</div>
                        </div>
                        <StatusBadge status={p.status} locale={locale} />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <IzvoriFeed nalazi={nalazi} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Trophy className="size-10 opacity-20" />
            {t.natjecaji.odaberi}
          </div>
        )}
      </div>
    </div>
    {selected && (
      <EntityChatPanel
        entityKind="natjecaj"
        entityId={selected.id}
        title={selected.naziv}
      />
    )}
    <EntityChatMobileNote />
    </div>
  );
}

function Info({
  label,
  value,
  accent,
  note,
}: {
  label: string;
  value: string;
  accent?: boolean;
  note?: string | false;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium", accent && "text-red-600 dark:text-red-400")}>{value}</div>
      {note && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <span className="relative flex size-1.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
          </span>
          <span className="truncate">{note}</span>
        </div>
      )}
    </div>
  );
}

const VRSTA_ICON = { rok: CalendarClock, dokumentacija: Globe, pojasnjenje: Globe, spomen: MessagesSquare };

const VRSTA_BADGE: Record<string, string> = {
  rok: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  dokumentacija: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  pojasnjenje: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  spomen: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function IzvoriFeed({ nalazi }: { nalazi: Nalaz[] }) {
  const t = useT();
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const novih = brojNovih(nalazi);

  const relativno = (h: number) =>
    h < 24
      ? t.natjecaji.izvori.prijeSati.replace("{n}", String(h))
      : t.natjecaji.izvori.prijeDana.replace("{n}", String(Math.round(h / 24)));

  return (
    <div data-tour="nat-izvori">
      <div className="mb-2 mt-6 flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.natjecaji.izvori.naslov}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {t.natjecaji.izvori.zadnjaProvjera} {relativno(4)}
            {novih > 0 && ` · ${novih} ${plural(locale, novih, t.natjecaji.izvori.novihNalaza)}`}
          </span>
          <button className="flex items-center gap-1.5 rounded-md border px-2 py-1 hover:bg-muted/50">
            <RefreshCw className="size-3" />
            {t.natjecaji.izvori.provjeriSad}
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {nalazi.length ? (
            nalazi.map((n, i) => {
              const Icon = VRSTA_ICON[n.vrsta];
              const open = openId === n.id;
              return (
                <div key={n.id} className={cn(i > 0 && "border-t")}>
                  <button
                    onClick={() => setOpenId(open ? null : n.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{n.naslov}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {n.izvor} · {relativno(n.prijeSati)}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", VRSTA_BADGE[n.vrsta])}>
                      {t.natjecaji.izvori.vrste[n.vrsta]}
                    </Badge>
                  </button>
                  {open && (
                    <div className="border-t bg-muted/30 px-4 py-3 pl-15">
                      <p className="text-sm text-muted-foreground">{n.sazetak}</p>
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4 hover:no-underline"
                      >
                        <ExternalLink className="size-3" />
                        {t.natjecaji.izvori.otvoriIzvornik}
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty>{t.natjecaji.izvori.prazno}</Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

