import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Empty } from "@/components/shared";
import { eur, shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FinancijePage() {
  const supabase = await createClient();
  const { data: fin } = await supabase
    .from("finances")
    .select("id, descr, amount, type, datum, status, clients(naziv)")
    .order("datum", { ascending: false });

  const rows = fin ?? [];
  const income = rows.filter((f) => f.type === "inc");
  const naplaceno = income.filter((f) => f.status === "naplaćeno").reduce((a, f) => a + Number(f.amount), 0);
  const dospjelo = rows.filter((f) => f.status === "kasni").reduce((a, f) => a + Number(f.amount), 0);
  const ukupnoPrihod = income.reduce((a, f) => a + Number(f.amount), 0);
  const trosak = rows.filter((f) => f.type === "exp").reduce((a, f) => a + Number(f.amount), 0);

  return (
    <>
      <PageHeader section="financije" title="Financije" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Ukupno prihodi" value={`${eur(ukupnoPrihod)} EUR`} />
          <Stat label="Naplaćeno" value={`${eur(naplaceno)} EUR`} tone="green" />
          <Stat label="Troškovi" value={`${eur(trosak)} EUR`} />
          <Stat label="Dospjelo (kasni)" value={`${eur(dospjelo)} EUR`} tone={dospjelo > 0 ? "red" : undefined} />
        </div>

        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Transakcije</div>
        <Card>
          <CardContent className="p-0">
            {rows.length ? (
              rows.map((f, i) => {
                const c = f.clients as { naziv: string } | null;
                return (
                  <div key={f.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t")}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{f.descr}</div>
                      <div className="text-xs text-muted-foreground">
                        {shortDate(f.datum)} · {c?.naziv ?? "—"}
                      </div>
                    </div>
                    {f.status === "kasni" ? (
                      <Badge className="border-transparent bg-red-500/15 text-red-700 dark:text-red-400">kasni</Badge>
                    ) : (
                      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{f.status}</Badge>
                    )}
                    <div className={cn("w-28 text-right text-sm font-medium", f.type === "inc" ? "text-emerald-600" : "text-red-600")}>
                      {f.type === "inc" ? "+" : "−"}{eur(Number(f.amount))} EUR
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty>Nema transakcija</Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "green" && "text-emerald-600", tone === "red" && "text-red-600")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
