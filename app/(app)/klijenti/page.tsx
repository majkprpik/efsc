import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusBadge, Empty, Dot } from "@/components/shared";
import { cp, ini, shortDate, eur } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Folder, Mail, Phone } from "lucide-react";

export default async function KlijentiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, naziv, contact, email, phone, status, tags, folder_path")
    .in("status", ["active", "inactive"])
    .order("naziv");
  if (sp.tag) query = query.contains("tags", [sp.tag]);
  const { data: clients } = await query;

  const allTags = [...new Set((clients ?? []).flatMap((c) => c.tags))].slice(0, 10);
  const selectedId = sp.id ?? clients?.[0]?.id;
  const selected = clients?.find((c) => c.id === selectedId);

  let projects: { id: string; naziv: string; status: string; color: string; rok: string | null }[] = [];
  let natjecaji: { id: string; naziv: string; status: string; rok: string | null }[] = [];
  let finances: { id: string; descr: string; amount: number; type: string; datum: string; status: string }[] = [];
  if (selectedId) {
    const [{ data: pr }, { data: fin }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, naziv, status, color, rok, natjecaji(id, naziv, status, rok)")
        .eq("client_id", selectedId),
      supabase
        .from("finances")
        .select("id, descr, amount, type, datum, status")
        .eq("client_id", selectedId)
        .order("datum", { ascending: false }),
    ]);
    projects = (pr ?? []).map((p) => ({ id: p.id, naziv: p.naziv, status: p.status, color: p.color, rok: p.rok }));
    finances = fin ?? [];
    // dedupe natjecaji from this client's projects
    const nat = new Map<string, { id: string; naziv: string; status: string; rok: string | null }>();
    (pr ?? []).forEach((p) => {
      const n = p.natjecaji as { id: string; naziv: string; status: string; rok: string | null } | null;
      if (n) nat.set(n.id, n);
    });
    natjecaji = [...nat.values()];
  }

  return (
    <>
      <PageHeader title="Klijenti" />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* LIST */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          <div className="flex flex-wrap gap-1.5 border-b p-3">
            <Link href="/klijenti">
              <Badge variant={!sp.tag ? "default" : "outline"} className="cursor-pointer">svi</Badge>
            </Link>
            {allTags.map((t) => (
              <Link key={t} href={`/klijenti?tag=${encodeURIComponent(t)}`}>
                <Badge variant={sp.tag === t ? "default" : "outline"} className="cursor-pointer">{t}</Badge>
              </Link>
            ))}
          </div>
          {clients?.length ? (
            clients.map((c) => {
              const [bg, fg] = cp(c.naziv);
              return (
                <Link
                  key={c.id}
                  href={`/klijenti?id=${c.id}${sp.tag ? `&tag=${encodeURIComponent(sp.tag)}` : ""}`}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50",
                    c.id === selectedId && "bg-muted",
                  )}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-medium"
                    style={{ background: bg, color: fg }}
                  >
                    {ini(c.naziv)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.naziv}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.contact ?? "—"}</div>
                  </div>
                  {c.status === "inactive" && (
                    <Badge variant="outline" className="text-muted-foreground">neaktivan</Badge>
                  )}
                </Link>
              );
            })
          ) : (
            <Empty>Nema klijenata</Empty>
          )}
        </div>

        {/* DETAIL */}
        <div className="min-h-0 overflow-y-auto p-6">
          {selected ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex items-start gap-4 border-b pb-5">
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

              {selected.folder_path && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{selected.folder_path}</span>
                </div>
              )}

              <Section title="Projekti">
                {projects.length ? (
                  projects.map((p, i) => (
                    <Link key={p.id} href={`/projekti?id=${p.id}`} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50", i > 0 && "border-t")}>
                      <Dot color={p.color} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.naziv}</div>
                        <div className="text-xs text-muted-foreground">Rok: {shortDate(p.rok)}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </Link>
                  ))
                ) : (
                  <Empty>Nema projekata</Empty>
                )}
              </Section>

              {natjecaji.length > 0 && (
                <Section title="Natječaji">
                  {natjecaji.map((n, i) => (
                    <Link key={n.id} href={`/natjecaji?id=${n.id}`} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50", i > 0 && "border-t")}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{n.naziv}</div>
                        <div className="text-xs text-muted-foreground">Rok: {shortDate(n.rok)}</div>
                      </div>
                      <StatusBadge status={n.status} />
                    </Link>
                  ))}
                </Section>
              )}

              {finances.length > 0 && (
                <Section title="Financije">
                  {finances.map((f, i) => (
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
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}
