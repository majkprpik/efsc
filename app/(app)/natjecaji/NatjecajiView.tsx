"use client";

import { useMemo, useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, Empty, Dot } from "@/components/shared";
import { shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Trophy, File } from "lucide-react";
import { EntityChatPanel, EntityChatMobileNote } from "@/components/EntityChat";

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
export type NatDoc = { id: string; natjecaj_id: string; filename: string };

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
              <Info label={t.natjecaji.rokPrijave} value={shortDate(selected.rok)} accent={selected.status === "aktivan"} />
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
                    <div key={d.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t")}>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <File className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 truncate text-sm">{d.filename}</div>
                      <span className="text-xs text-muted-foreground">Dokumentacija</span>
                    </div>
                  ))
                ) : (
                  <Empty>{t.projekti.nemaDokumenata}</Empty>
                )}
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

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium", accent && "text-red-600 dark:text-red-400")}>{value}</div>
    </div>
  );
}

