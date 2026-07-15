import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Topbar, Card, Pill, Progress, Empty } from "@/components/ui";
import { daysUntil, shortDate } from "@/lib/ui";

export default async function DashboardPage() {
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
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .neq("status", "Završen"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "potencijalni"),
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
      .select("id, naziv, zadnji_kontakt, unio_name, status")
      .eq("status", "potencijalni")
      .order("zadnji_kontakt", { ascending: false })
      .limit(4),
  ]);

  // Deadlines within 7 days
  const thisWeek =
    deadlines?.filter((d) => {
      const days = daysUntil(d.datum);
      return days !== null && days >= 0 && days <= 7;
    }).length ?? 0;

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-[26px_30px]">
        <div className="mb-6 grid grid-cols-4 gap-3.5">
          <Stat label="Aktivni klijenti" value={activeClients ?? 0} accent="gold" sub="ukupno" />
          <Stat label="Aktivni projekti" value={activeProjects ?? 0} accent="green" sub="u tijeku" />
          <Stat label="Potencijalni" value={potencijalni ?? 0} accent="blue" sub="u praćenju" />
          <Stat
            label="Rokovi ovaj tjedan"
            value={thisWeek}
            accent="red"
            sub={thisWeek > 0 ? "hitno!" : "—"}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-[18px]">
          <div className="flex flex-col gap-4">
            <Card
              title="Moji taskovi"
              action={<Link href="/taskovi" className="text-[11px] text-gold">svi →</Link>}
            >
              {tasks?.length ? (
                tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0">
                    <div className="flex-1">
                      <div className="text-[13px]">{t.title}</div>
                      <div className="text-[11px] text-t3">
                        {(t.projects as { naziv: string } | null)?.naziv ?? "—"} · {shortDate(t.due)}
                      </div>
                    </div>
                    <PriorityPill p={t.priority} />
                  </div>
                ))
              ) : (
                <Empty>Nema taskova</Empty>
              )}
            </Card>

            <Card
              title="Aktivni projekti"
              action={<Link href="/projekti" className="text-[11px] text-gold">svi →</Link>}
            >
              {projects?.length ? (
                projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projekti?id=${p.id}`}
                    className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0 hover:bg-bg3"
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{p.naziv}</div>
                      <div className="truncate text-[11px] text-t3">
                        {(p.clients as { naziv: string } | null)?.naziv ?? "—"}
                      </div>
                    </div>
                    <Progress value={p.progress} color={p.color} />
                    <Pill status={p.status} />
                  </Link>
                ))
              ) : (
                <Empty>Nema projekata</Empty>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card
              title="Rokovi koji se bliže"
              action={<Link href="/rokovi" className="text-[11px] text-gold">kalendar →</Link>}
            >
              {deadlines?.length ? (
                deadlines.map((d) => {
                  const days = daysUntil(d.datum);
                  const urg = days === null ? "ok" : days <= 3 ? "urg" : days <= 15 ? "warn" : "ok";
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0">
                      <span
                        className={`min-w-[44px] text-[12px] font-medium ${
                          urg === "urg" ? "text-red" : urg === "warn" ? "text-gold" : "text-t3"
                        }`}
                      >
                        {shortDate(d.datum)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px]">{d.text}</span>
                      <span className="text-[11px] text-t3">
                        {days !== null && days >= 0 ? `za ${days}d.` : "prošlo"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <Empty>Nema rokova</Empty>
              )}
            </Card>

            <Card
              title="Potencijalni — follow-up"
              action={<Link href="/potencijalni" className="text-[11px] text-gold">svi →</Link>}
            >
              {pot?.length ? (
                pot.map((p) => (
                  <Link
                    key={p.id}
                    href={`/potencijalni?id=${p.id}`}
                    className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0 hover:bg-bg3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{p.naziv}</div>
                      <div className="truncate text-[11px] text-t3">
                        {shortDate(p.zadnji_kontakt)} · {p.unio_name ?? "—"}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <Empty>Nema potencijalnih</Empty>
              )}
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
  accent,
  sub,
}: {
  label: string;
  value: number;
  accent: "gold" | "green" | "blue" | "red";
  sub: string;
}) {
  const bar = {
    gold: "var(--gold)",
    green: "var(--green)",
    blue: "var(--blue)",
    red: "var(--red)",
  }[accent];
  return (
    <div className="relative overflow-hidden rounded-[var(--r)] border border-b bg-bg2 px-5 py-[18px]">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: bar }} />
      <div className="mb-2 text-[10px] uppercase tracking-[1px] text-t3">{label}</div>
      <div className="font-serif text-[34px] leading-none">{value}</div>
      <div className="mt-[5px] text-[11px] text-t3">{sub}</div>
    </div>
  );
}

function PriorityPill({ p }: { p: "h" | "m" | "l" }) {
  const map = {
    h: ["bg-[var(--rb)] text-red", "hitno"],
    m: ["bg-[var(--gb)] text-gold", "visok"],
    l: ["bg-bg4 text-t3", "nizak"],
  } as const;
  const [cls, label] = map[p];
  return <span className={`rounded-full px-2.5 py-[3px] text-[10px] font-medium ${cls}`}>{label}</span>;
}
