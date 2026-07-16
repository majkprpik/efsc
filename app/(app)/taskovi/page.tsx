import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PriorityBadge } from "@/components/shared";
import { ini, shortDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

const COLS = ["todo", "doing", "done"] as const;

export default async function TaskoviPage() {
  const dict = await getT();
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due, assignee_name, projects(naziv)")
    .order("due");

  return (
    <>
      <PageHeader section="taskovi" title={dict.nav.taskovi} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {COLS.map((col) => {
            const items = (tasks ?? []).filter((t) => t.status === col);
            return (
              <div key={col} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-medium">{dict.taskovi.kolone[col]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2 p-3">
                  {items.length ? (
                    items.map((t) => {
                      const proj = t.projects as { naziv: string } | null;
                      return (
                        <div key={t.id} className="rounded-md border bg-background p-3">
                          <div className={cn("text-sm font-medium", t.status === "done" && "text-muted-foreground line-through")}>
                            {t.title}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{proj?.naziv ?? "—"}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
                                {t.assignee_name ? ini(t.assignee_name) : "—"}
                              </span>
                              {shortDate(t.due)}
                            </span>
                            <PriorityBadge p={t.priority} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">Nema</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
