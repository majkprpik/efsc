import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusBadge, Empty, Dot } from "@/components/shared";
import { shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Trophy, Folder, FileText, File } from "lucide-react";

const FILTERS = [
  { key: "svi", label: "svi" },
  { key: "aktivan", label: "aktivni" },
  { key: "zatvoren", label: "zatvoreni" },
  { key: "arhiva", label: "arhiva" },
] as const;

export default async function NatjecajiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; f?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.f ?? "svi";
  const supabase = await createClient();

  let query = supabase
    .from("natjecaji")
    .select("id, naziv, status, rok, tijelo, iznos, sufinanciranje, tags, folder_path, nat_folder_path")
    // aktivni prvi, pa po roku
    .order("status", { ascending: true })
    .order("rok", { ascending: true, nullsFirst: false });
  if (filter !== "svi") query = query.eq("status", filter as "aktivan" | "zatvoren" | "arhiva");
  const { data: natjecaji } = await query;

  const { data: projRows } = await supabase
    .from("projects")
    .select("id, natjecaj_id, naziv, progress, color, status, clients(naziv)");

  const selectedId = sp.id ?? natjecaji?.[0]?.id;
  const selected = natjecaji?.find((n) => n.id === selectedId);
  const selectedProjects = projRows?.filter((p) => p.natjecaj_id === selectedId) ?? [];

  let docs: { id: string; filename: string }[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("natjecaj_docs")
      .select("id, filename")
      .eq("natjecaj_id", selectedId)
      .order("filename");
    docs = data ?? [];
  }

  const clientCount = (natjecajId: string) =>
    new Set(
      projRows
        ?.filter((p) => p.natjecaj_id === natjecajId)
        .map((p) => (p.clients as { naziv: string } | null)?.naziv),
    ).size;

  return (
    <>
      <PageHeader title="Natječaji" />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] overflow-hidden">
        {/* LIST */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          <div className="flex flex-wrap gap-1.5 border-b p-3">
            {FILTERS.map((f) => (
              <Link key={f.key} href={`/natjecaji?f=${f.key}`}>
                <Badge variant={filter === f.key ? "default" : "outline"} className="cursor-pointer">
                  {f.label}
                </Badge>
              </Link>
            ))}
          </div>
          {natjecaji?.length ? (
            natjecaji.map((n) => (
              <Link
                key={n.id}
                href={`/natjecaji?id=${n.id}${filter !== "svi" ? `&f=${filter}` : ""}`}
                className={cn(
                  "flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50",
                  n.id === selectedId && "bg-muted",
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Trophy className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.naziv}</div>
                  <div className="text-xs text-muted-foreground">
                    {clientCount(n.id)} kl. · {shortDate(n.rok)}
                  </div>
                </div>
                <StatusBadge status={n.status} />
              </Link>
            ))
          ) : (
            <Empty>Nema natječaja</Empty>
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
                  <div className="font-serif text-2xl leading-tight tracking-tight">{selected.naziv}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[
                      selected.tijelo,
                      selected.iznos,
                      selected.sufinanciranje && `${selected.sufinanciranje} sufinanciranje`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3">
                <Info label="Rok prijave" value={shortDate(selected.rok)} accent={selected.status === "aktivan"} />
                <Info label="Klijenata" value={String(clientCount(selected.id))} />
                <Info label="Projekata" value={String(selectedProjects.length)} />
              </div>

              <FolderBar path={selected.folder_path} label="otvori" icon={Folder} />
              <FolderBar path={selected.nat_folder_path} label="dokumentacija" icon={FileText} />

              <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dokumenti natječaja
              </div>
              <Card>
                <CardContent className="p-0">
                  {docs.length ? (
                    docs.map((d, i) => (
                      <div key={d.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t")}>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <File className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1 truncate text-sm">{d.filename}</div>
                        <span className="text-xs text-muted-foreground">Dokumentacija</span>
                      </div>
                    ))
                  ) : (
                    <Empty>Nema dokumenata</Empty>
                  )}
                </CardContent>
              </Card>

              {selectedProjects.length > 0 && (
                <>
                  <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Projekti pod natječajem
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
                            <div className="truncate text-xs text-muted-foreground">
                              {(p.clients as { naziv: string } | null)?.naziv ?? "—"}
                            </div>
                          </div>
                          <StatusBadge status={p.status} />
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
              Odaberi natječaj
            </div>
          )}
        </div>
      </div>
    </>
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

function FolderBar({
  path,
  label,
  icon: Icon,
}: {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!path) return null;
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{path}</span>
      <span className="text-xs text-primary">{label}</span>
    </div>
  );
}
