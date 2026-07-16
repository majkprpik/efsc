import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/shared";
import { AddTaskButton } from "@/components/AddTask";
import { TaskBoard, type BoardTask } from "./TaskBoard";

export default async function TaskoviPage() {
  const dict = await getT();
  const supabase = await createClient();
  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, due, assignee_name, sort, project_id, projects(naziv)")
      .order("sort"),
    supabase.from("projects").select("id, naziv").order("naziv"),
  ]);

  const board: BoardTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due: t.due,
    assignee_name: t.assignee_name,
    sort: t.sort,
    project_id: t.project_id,
    projectNaziv: (t.projects as { naziv: string } | null)?.naziv ?? null,
  }));

  return (
    <>
      <PageHeader section="taskovi" title={dict.nav.taskovi}>
        <AddTaskButton projects={projects ?? []} />
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-6">
        <TaskBoard tasks={board} projects={projects ?? []} />
      </div>
    </>
  );
}
