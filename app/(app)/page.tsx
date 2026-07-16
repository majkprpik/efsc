import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader, StatusBadge, PriorityBadge, Empty, Dot } from "@/components/shared";
import { daysUntil, shortDate } from "@/lib/ui";
import { Users, FolderKanban, UserPlus, CalendarClock } from "lucide-react";

export default async function DashboardPage() {
  const dict = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const [
    { count: activeClients },
    { count: activeProjects },
    { count: potencijalni },
    { data: projects },
    { data: deadlines },
    { data: tasks },
    { data: pot },
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "Završen"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "potencijalni"),
    supabase
      .from("projects")
      .select("id, naziv, status, progress, color, rok, clients(naziv)")
      .neq("status", "Završen")
      .order("progress", { ascending: false })
      .limit(5),
    supabase.from("deadlines").select("id, text, datum").order("datum").limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due, projects(naziv)")
      .neq("status", "done")
      .order("due")
      .limit(4),
    supabase
      .from("clients")
      .select("id, naziv, zadnji_kontakt, unio_name")
      .eq("status", "potencijalni")
      .order("zadnji_kontakt", { ascending: false })
      .limit(4),
  ]);

  const thisWeek =
    deadlines?.filter((d) => {
      const days = daysUntil(d.datum);
      return days !== null && days >= 0 && days <= 7;
    }).length ?? 0;

  return (
    <>
      <PageHeader section="dashboard" title={dict.nav.dashboard} />
      <div className="flex-1 overflow-y-auto p-6">
        <div data-tour="stat-row" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat tour="stat-klijenti" label="Aktivni klijenti" value={activeClients ?? 0} icon={Users} />
          <Stat tour="stat-projekti" label="Aktivni projekti" value={activeProjects ?? 0} icon={FolderKanban} />
          <Stat tour="stat-potencijalni" label="Potencijalni" value={potencijalni ?? 0} icon={UserPlus} />
          <Stat tour="stat-rokovi" label="Rokovi ovaj tjedan" value={thisWeek} icon={CalendarClock} accent={thisWeek > 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Moji taskovi</CardTitle>
                <Link href="/taskovi" className="text-xs text-muted-foreground hover:text-foreground">
                  svi →
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {tasks?.length ? (
                  tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 border-t px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {(t.projects as { naziv: string } | null)?.naziv ?? "—"} · {shortDate(t.due)}
                        </div>
                      </div>
                      <PriorityBadge p={t.priority} locale={locale} />
                    </div>
                  ))
                ) : (
                  <Empty>{dict.taskovi.prazno}</Empty>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Aktivni projekti</CardTitle>
                <Link href="/projekti" className="text-xs text-muted-foreground hover:text-foreground">
                  svi →
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {projects?.length ? (
                  projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projekti?id=${p.id}`}
                      className="flex items-center gap-3 border-t px-6 py-3 hover:bg-muted/50"
                    >
                      <Dot color={p.color} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.naziv}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {(p.clients as { naziv: string } | null)?.naziv ?? "—"}
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <Progress value={p.progress} className="h-1.5" />
                      </div>
                      <StatusBadge status={p.status} locale={locale} />
                    </Link>
                  ))
                ) : (
                  <Empty>Nema projekata</Empty>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">{dict.rokovi.koji_se_blize}</CardTitle>
                <Link href="/rokovi" className="text-xs text-muted-foreground hover:text-foreground">
                  kalendar →
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {deadlines?.length ? (
                  deadlines.map((d) => {
                    const days = daysUntil(d.datum);
                    const cls =
                      days === null ? "text-muted-foreground" : days <= 3 ? "text-red-600 dark:text-red-400" : days <= 15 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
                    return (
                      <div key={d.id} className="flex items-center gap-3 border-t px-6 py-3">
                        <span className={`min-w-[44px] text-xs font-medium ${cls}`}>{shortDate(d.datum)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{d.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {days !== null && days >= 0 ? dict.rokovi.zaDana.replace("{n}", String(days)) : dict.rokovi.proslo}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <Empty>Nema rokova</Empty>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Potencijalni — follow-up</CardTitle>
                <Link href="/potencijalni" className="text-xs text-muted-foreground hover:text-foreground">
                  svi →
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {pot?.length ? (
                  pot.map((p) => (
                    <Link
                      key={p.id}
                      href={`/potencijalni?id=${p.id}`}
                      className="flex items-center gap-3 border-t px-6 py-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.naziv}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {shortDate(p.zadnji_kontakt)} · {p.unio_name ?? "—"}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <Empty>Nema potencijalnih</Empty>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
  tour,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  tour?: string;
}) {
  return (
    <Card data-tour={tour}>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`mt-1 text-3xl font-semibold tabular-nums ${accent ? "text-red-600 dark:text-red-400" : ""}`}>
            {value}
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
