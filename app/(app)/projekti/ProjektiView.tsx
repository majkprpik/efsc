"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, Empty, Dot } from "@/components/shared";
import { DocDialog } from "@/components/DocDialog";
import { DocUploadButton, DocDropzone } from "@/components/DocUpload";
import { shortDate } from "@/lib/ui";
import { useT, useLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Folder, Trophy, CheckCircle2 } from "lucide-react";

export type Projekt = {
  id: string;
  naziv: string;
  status: string;
  progress: number;
  color: string;
  rok: string | null;
  value: string | null;
  folder_path: string;
  clientNaziv: string | null;
  natjecaj: { id: string; naziv: string } | null;
};
export type ProjDoc = {
  id: string;
  project_id: string;
  name: string;
  uploaded: boolean;
  storage_path: string | null;
  note: string | null;
  uploaded_at: string | null;
};
export type ProjTask = {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
  assignee_name: string | null;
  due: string | null;
};

const FILTERS = ["svi", "Aktivan", "U pripremi", "Kasni", "Završen"] as const;

export function ProjektiView({
  projects,
  docs,
  tasks,
  initialId,
}: {
  projects: Projekt[];
  docs: ProjDoc[];
  tasks: ProjTask[];
  initialId?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<string>("svi");
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialId ?? projects[0]?.id,
  );

  const filtered = useMemo(
    () => (filter === "svi" ? projects : projects.filter((p) => p.status === filter)),
    [filter, projects],
  );

  // keep selection valid within the current filter
  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  const selectedDocs = selected ? docs.filter((d) => d.project_id === selected.id) : [];
  const selectedTasks = selected ? tasks.filter((t) => t.project_id === selected.id) : [];
  const okCount = selectedDocs.filter((d) => d.uploaded).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
      {/* LIST */}
      <div className="flex min-h-0 flex-col overflow-y-auto border-r">
        <div className="flex flex-wrap gap-1.5 border-b p-3">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}>
              <Badge variant={filter === f ? "default" : "outline"} className="cursor-pointer">
                {t.projekti.filteri[f]}
              </Badge>
            </button>
          ))}
        </div>
        {filtered.length ? (
          filtered.map((p, i) => (
            <button
              key={p.id}
              data-tour={`proj-row-${i}`}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "flex items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted/50",
                p.id === selected?.id && "bg-muted",
              )}
            >
              <Dot color={p.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.naziv}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.clientNaziv ?? "—"}
                </span>
                <Progress value={p.progress} className="mt-1.5 h-1" />
              </span>
              <StatusBadge status={p.status} locale={locale} />
            </button>
          ))
        ) : (
          <Empty>{t.projekti.prazno}</Empty>
        )}
      </div>

      {/* DETAIL */}
      <div className="min-h-0 overflow-y-auto p-6">
        {selected ? (
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-start gap-4 border-b pb-5">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${selected.color}22`, color: selected.color }}
              >
                <Folder className="size-6" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-semibold leading-tight tracking-tight">
                  {selected.naziv}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {[selected.clientNaziv, selected.value].filter(Boolean).join(" · ")}
                </div>
              </div>
              <StatusBadge status={selected.status} locale={locale} />
            </div>

            <div data-tour="proj-info" className="mb-5 grid grid-cols-3 gap-3">
              <Info label={t.common.napredak} value={`${selected.progress}%`} />
              <Info label={t.common.rok} value={shortDate(selected.rok)} />
              <Info
                label={t.common.dokumentacija}
                value={`${okCount}/${selectedDocs.length}`}
                accent={
                  selectedDocs.length > 0 && okCount === selectedDocs.length ? "green" : undefined
                }
              />
            </div>

            {selected.natjecaj && (
              <Link
                href={`/natjecaji?id=${selected.natjecaj.id}`}
                data-tour="proj-natjecaj-link"
                className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm hover:bg-muted"
              >
                <Trophy className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{selected.natjecaj.naziv}</span>
                <span className="text-xs text-primary">{t.common.otvori} →</span>
              </Link>
            )}

            {/* DOCS CHECKLIST */}
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.common.dokumentacija}
              </div>
              {selectedDocs.length > 0 && okCount === selectedDocs.length && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> {t.common.kompletno}
                </span>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {selectedDocs.length ? (
                  selectedDocs.map((d, i) => (
                    <div
                      key={d.id}
                      className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}
                    >
                      <DocDialog
                        docKind="project"
                        docId={d.id}
                        storagePath={d.storage_path}
                        fileName={d.name}
                        uploaded={d.uploaded}
                        uploadedAt={d.uploaded_at}
                        context={selected.naziv}
                      />
                      {d.uploaded ? (
                        <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          {d.uploaded_at ? shortDate(d.uploaded_at) : "ok"}
                        </Badge>
                      ) : (
                        <DocUploadButton projectId={selected.id} docId={d.id} />
                      )}
                    </div>
                  ))
                ) : (
                  <Empty>{t.projekti.nemaDokumenata}</Empty>
                )}
                <div className="p-3">
                  <DocDropzone projectId={selected.id} />
                </div>
              </CardContent>
            </Card>

            {/* TASKS */}
            {selectedTasks.length > 0 && (
              <>
                <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.projekti.taskovi}
                </div>
                <Card>
                  <CardContent className="p-0">
                    {selectedTasks.map((t, i) => (
                      <div
                        key={t.id}
                        className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}
                      >
                        <div
                          className={cn(
                            "size-4 shrink-0 rounded-sm border",
                            t.status === "done"
                              ? "border-emerald-600 bg-emerald-600"
                              : "border-muted-foreground/40",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm",
                              t.status === "done" && "text-muted-foreground line-through",
                            )}
                          >
                            {t.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.assignee_name ?? "—"} · {shortDate(t.due)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Folder className="size-10 opacity-20" />
            {t.projekti.odaberi}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: "green" }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium", accent === "green" && "text-emerald-600")}>
        {value}
      </div>
    </div>
  );
}
