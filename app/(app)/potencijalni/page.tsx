import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Empty } from "@/components/shared";
import { cp, ini, shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Sparkles, Phone } from "lucide-react";

export default async function PotencijalniPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: pot } = await supabase
    .from("clients")
    .select("id, naziv, contact, phone, saz, zadnji_kontakt, unio_name")
    .eq("status", "potencijalni")
    .order("zadnji_kontakt", { ascending: false });

  const selectedId = sp.id ?? pot?.[0]?.id;
  const selected = pot?.find((p) => p.id === selectedId);

  let notes: { id: string; author: string; text: string; ts_label: string | null }[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("client_notes")
      .select("id, author, text, ts_label")
      .eq("client_id", selectedId)
      .order("created_at");
    notes = data ?? [];
  }

  return (
    <>
      <PageHeader title="Potencijalni klijenti" />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* LIST */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          {pot?.length ? (
            pot.map((p) => {
              const [bg, fg] = cp(p.naziv);
              return (
                <Link
                  key={p.id}
                  href={`/potencijalni?id=${p.id}`}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50",
                    p.id === selectedId && "bg-muted",
                  )}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-medium"
                    style={{ background: bg, color: fg }}
                  >
                    {ini(p.naziv)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.naziv}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {shortDate(p.zadnji_kontakt)} · {p.unio_name ?? "—"}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <Empty>Nema potencijalnih</Empty>
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
                  <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    {selected.contact && <span>{selected.contact}</span>}
                    {selected.phone && (
                      <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{selected.phone}</span>
                    )}
                  </div>
                </div>
                <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400">potencijalni</Badge>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <Info label="Zadnji kontakt" value={shortDate(selected.zadnji_kontakt)} />
                <Info label="Unio/la" value={selected.unio_name ?? "—"} />
              </div>

              {selected.saz && (
                <div className="mb-5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    <Sparkles className="size-3.5" /> AI sažetak ideje
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.saz}</p>
                </div>
              )}

              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bilješke
              </div>
              <Card>
                <CardContent className="space-y-3 p-4">
                  {notes.length ? (
                    notes.map((n) => (
                      <div key={n.id} className={n.author === "AI" ? "flex gap-2.5" : "flex flex-row-reverse gap-2.5"}>
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-medium",
                            n.author === "AI"
                              ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                              : "bg-primary/15 text-primary",
                          )}
                        >
                          {n.author}
                        </span>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            n.author === "AI" ? "bg-muted" : "bg-primary/10",
                          )}
                        >
                          {n.text}
                          {n.ts_label && <div className="mt-1 text-[10px] text-muted-foreground">{n.ts_label}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty>Nema bilješki</Empty>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              Odaberi potencijalnog klijenta
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
