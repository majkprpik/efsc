"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["todo", "doing", "done"] as const;
type Status = (typeof STATUSES)[number];

const PRIORITIES = ["h", "m", "l"] as const;
type Priority = (typeof PRIORITIES)[number];

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "");
  const due = String(formData.get("due") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "m");
  if (!title) return { error: "Zadatak treba naziv." };

  const priority = (PRIORITIES as readonly string[]).includes(priorityRaw)
    ? (priorityRaw as Priority)
    : "m";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("id, name").eq("id", user.id).single()
    : { data: null };

  // New tasks land at the bottom of the todo column.
  const { data: last } = await supabase
    .from("tasks")
    .select("sort")
    .eq("status", "todo")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tasks").insert({
    title,
    project_id: projectId || null,
    due: due || null,
    priority,
    status: "todo",
    sort: (last?.sort ?? 0) + 1000,
    assignee_id: profile?.id ?? null,
    assignee_name: profile?.name ?? null,
  });
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/taskovi");
  revalidatePath("/projekti");
  return { ok: true };
}

/** Toggle a task between done and todo from the project checklist. */
export async function setTaskStatus(formData: FormData) {
  const supabase = await createClient();

  const taskId = String(formData.get("taskId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!taskId) return { error: "Nedostaje zadatak." };
  if (!(STATUSES as readonly string[]).includes(statusRaw)) {
    return { error: "Nepoznat status." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: statusRaw as Status })
    .eq("id", taskId);
  if (error) return { error: `Promjena nije uspjela: ${error.message}` };

  revalidatePath("/taskovi");
  revalidatePath("/projekti");
  return { ok: true };
}

/**
 * Drop a task into `status` between the two cards it landed among. `sort` is a
 * float so an insert only touches the dragged row — no reindexing the column.
 */
export async function moveTask(formData: FormData) {
  const supabase = await createClient();

  const taskId = String(formData.get("taskId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const beforeId = String(formData.get("beforeId") ?? ""); // card it was dropped above
  const afterId = String(formData.get("afterId") ?? ""); // card it was dropped below
  if (!taskId) return { error: "Nedostaje zadatak." };
  if (!(STATUSES as readonly string[]).includes(statusRaw)) {
    return { error: "Nepoznat status." };
  }

  const neighbourSort = async (id: string) =>
    id
      ? (await supabase.from("tasks").select("sort").eq("id", id).maybeSingle()).data?.sort ?? null
      : null;

  const [above, below] = await Promise.all([neighbourSort(afterId), neighbourSort(beforeId)]);

  let sort: number;
  if (above !== null && below !== null) sort = (above + below) / 2;
  else if (above !== null) sort = above + 1000;
  else if (below !== null) sort = below - 1000;
  else sort = 1000; // empty column

  const { error } = await supabase
    .from("tasks")
    .update({ status: statusRaw as Status, sort })
    .eq("id", taskId);
  if (error) return { error: `Premještanje nije uspjelo: ${error.message}` };

  revalidatePath("/taskovi");
  revalidatePath("/projekti");
  return { ok: true };
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient();

  const taskId = String(formData.get("taskId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "");
  const due = String(formData.get("due") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "m");
  const statusRaw = String(formData.get("status") ?? "");
  if (!taskId) return { error: "Nedostaje zadatak." };
  if (!title) return { error: "Zadatak treba naziv." };

  const patch: {
    title: string;
    project_id: string | null;
    due: string | null;
    priority: Priority;
    status?: Status;
  } = {
    title,
    project_id: projectId || null,
    due: due || null,
    priority: (PRIORITIES as readonly string[]).includes(priorityRaw)
      ? (priorityRaw as Priority)
      : "m",
  };
  if ((STATUSES as readonly string[]).includes(statusRaw)) patch.status = statusRaw as Status;

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/taskovi");
  revalidatePath("/projekti");
  return { ok: true };
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { error: "Nedostaje zadatak." };

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: `Brisanje nije uspjelo: ${error.message}` };

  revalidatePath("/taskovi");
  revalidatePath("/projekti");
  return { ok: true };
}
