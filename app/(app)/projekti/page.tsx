import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader, StatusBadge, Empty, Dot } from "@/components/shared";
import { RowPending } from "@/components/RowPending";
import { DocDialog } from "@/components/DocDialog";
import { DocUploadButton, DocDropzone } from "@/components/DocUpload";
import { shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Folder, Trophy, CheckCircle2 } from "lucide-react";

const FILTERS = [
  { key: "svi", label: "svi" },
  { key: "Aktivan", label: "aktivni" },
  { key: "U pripremi", label: "priprema" },
  { key: "Kasni", label: "kasni" },
  { key: "Završen", label: "završeni" },
] as const;

export default async function ProjektiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; f?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.f ?? "svi";
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, naziv, status, progress, color, rok, value, folder_path, clients(naziv), natjecaji(id, naziv)")
    .order("created_at", { ascending: true });
  if (filter !== "svi") {
    query = query.eq("status", filter as "Aktivan" | "U pripremi" | "Kasni" | "Završen");
  }
  const { data: projects } = await query;

  const selectedId = sp.id ?? projects?.[0]?.id;
  const selected = projects?.find((p) => p.id === selectedId);

  let docs: {
    id: string;
    name: string;
    uploaded: boolean;
    storage_path: string | null;
    note: string | null;
    uploaded_at: string | null;
  }[] = [];
  let tasks: { id: string; title: string; status: string; assignee_name: string | null; due: string | null }[] = [];
  if (selectedId) {
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase
        .from("project_docs")
        .select("id, name, uploaded, storage_path, note, uploaded_at")
        .eq("project_id", selectedId)
        .order("sort"),
      supabase
        .from("tasks")
        .select("id, title, status, assignee_name, due")
        .eq("project_id", selectedId)
        .order("due"),
    ]);
    docs = d ?? [];
    tasks = t ?? [];
  }

  const okCount = docs.filter((d) => d.uploaded).length;
  const client = selected?.clients as { naziv: string } | null;
  const natjecaj = selected?.natjecaji as { id: string; naziv: string } | null;

  return (
    <>
      <PageHeader title="Projekti" />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* LIST */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          <div className="flex flex-wrap gap-1.5 border-b p-3">
            {FILTERS.map((f) => (
              <Link key={f.key} href={`/projekti?f=${encodeURIComponent(f.key)}`}>
                <Badge variant={filter === f.key ? "default" : "outline"} className="cursor-pointer">
                  {f.label}
                </Badge>
              </Link>
            ))}
          </div>
          {projects?.length ? (
            projects.map((p) => {
              const c = p.clients as { naziv: string } | null;
              return (
                <Link
                  key={p.id}
                  href={`/projekti?id=${p.id}${filter !== "svi" ? `&f=${encodeURIComponent(filter)}` : ""}`}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50",
                    p.id === selectedId && "bg-muted",
                  )}
                >
                  <Dot color={p.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.naziv}</div>
                    <div className="truncate text-xs text-muted-foreground">{c?.naziv ?? "—"}</div>
                    <Progress value={p.progress} className="mt-1.5 h-1" />
                  </div>
                  <RowPending />
                  <StatusBadge status={p.status} />
                </Link>
              );
            })
          ) : (
            <Empty>Nema projekata</Empty>
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
                  <div className="text-2xl font-semibold leading-tight tracking-tight">{selected.naziv}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[client?.naziv, selected.value].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3">
                <Info label="Napredak" value={`${selected.progress}%`} />
                <Info label="Rok" value={shortDate(selected.rok)} />
                <Info
                  label="Dokumentacija"
                  value={`${okCount}/${docs.length}`}
                  accent={docs.length > 0 && okCount === docs.length ? "green" : undefined}
                />
              </div>

              {natjecaj && (
                <Link
                  href={`/natjecaji?id=${natjecaj.id}`}
                  className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm hover:bg-muted"
                >
                  <Trophy className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{natjecaj.naziv}</span>
                  <span className="text-xs text-primary">otvori →</span>
                </Link>
              )}

              {/* DOCS CHECKLIST */}
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dokumentacija
                </div>
                {docs.length > 0 && okCount === docs.length && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> kompletno
                  </span>
                )}
              </div>
              <Card>
                <CardContent className="p-0">
                  {docs.length ? (
                    docs.map((d, i) => (
                      <div key={d.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}>
                        <DocDialog
                          docKind="project"
                          docId={d.id}
                          storagePath={d.storage_path}
                          fileName={d.name}
                          uploaded={d.uploaded}
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
                    <Empty>Nema dokumenata</Empty>
                  )}
                  <div className="p-3">
                    <DocDropzone projectId={selected.id} />
                  </div>
                </CardContent>
              </Card>

              {/* TASKS */}
              {tasks.length > 0 && (
                <>
                  <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Taskovi
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      {tasks.map((t, i) => (
                        <div key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t")}>
                          <div
                            className={cn(
                              "size-4 shrink-0 rounded-sm border",
                              t.status === "done" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground/40",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className={cn("truncate text-sm", t.status === "done" && "text-muted-foreground line-through")}>
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
              Odaberi projekt
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: "green" }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium", accent === "green" && "text-emerald-600")}>{value}</div>
    </div>
  );
}
