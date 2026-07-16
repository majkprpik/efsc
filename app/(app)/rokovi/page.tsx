import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Empty } from "@/components/shared";
import { daysUntil, shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";


export default async function RokoviPage() {
  const t = await getT();
  const DAYS = t.rokovi.dani;
  const MONTHS = t.rokovi.mjeseci;
  const supabase = await createClient();
  const { data: rokovi } = await supabase
    .from("deadlines")
    .select("id, text, datum")
    .order("datum");

  const now = new Date();
  const dateLine = `${DAYS[now.getDay()]}, ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}.`;

  return (
    <>
      <PageHeader section="rokovi" title={t.nav.rokovi} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* today banner */}
          <div className="mb-6 flex items-baseline gap-5 rounded-lg border bg-card px-6 py-5">
            <div className="text-5xl font-semibold tabular-nums">{now.getDate()}</div>
            <div>
              <div className="text-base font-medium">{dateLine}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Danas · Orbit projektni hub · ESFC</div>
            </div>
          </div>

          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Svi rokovi</div>
          <Card>
            <CardContent className="p-0">
              {rokovi?.length ? (
                rokovi.map((r, i) => {
                  const days = daysUntil(r.datum);
                  const urg = days === null ? "ok" : days < 0 ? "past" : days <= 3 ? "urg" : days <= 15 ? "warn" : "ok";
                  const dateCls = {
                    urg: "text-red-600 dark:text-red-400",
                    warn: "text-amber-600 dark:text-amber-400",
                    ok: "text-muted-foreground",
                    past: "text-muted-foreground/60",
                  }[urg];
                  return (
                    <div key={r.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t")}>
                      <span className={cn("min-w-[48px] text-sm font-medium", dateCls)}>{shortDate(r.datum)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{r.text}</span>
                      <span className="text-xs text-muted-foreground">
                        {days === null ? "" : days < 0 ? t.rokovi.proslo : t.rokovi.zaDana.replace("{n}", String(days))}
                      </span>
                      {urg === "urg" && <Badge className="border-transparent bg-red-500/15 text-red-700 dark:text-red-400">hitno</Badge>}
                      {urg === "warn" && <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400">uskoro</Badge>}
                    </div>
                  );
                })
              ) : (
                <Empty>{t.rokovi.prazno}</Empty>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
