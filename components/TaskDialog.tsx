"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask } from "@/app/(app)/taskovi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const PRIORITIES = ["h", "m", "l"] as const;
const STATUSES = ["todo", "doing", "done"] as const;

export type TaskDraft = {
  id: string;
  title: string;
  status: string;
  priority: "h" | "m" | "l";
  due: string | null;
  project_id: string | null;
};

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Create (no `task`) or edit (with `task`) — same fields either way. */
export function TaskDialog({
  task,
  projectId,
  projects,
  open,
  onOpenChange,
}: {
  task?: TaskDraft;
  /** Fixed project for new tasks — hides the picker. */
  projectId?: string;
  projects?: { id: string; naziv: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const editing = !!task;
  const [priority, setPriority] = useState<string>(task?.priority ?? "m");
  const [status, setStatus] = useState<string>(task?.status ?? "todo");
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (projectId) fd.set("projectId", projectId);
    fd.set("priority", priority);
    start(async () => {
      let res;
      if (editing) {
        fd.set("taskId", task.id);
        fd.set("status", status);
        res = await updateTask(fd);
      } else {
        res = await createTask(fd);
      }
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? t.taskovi.spremljen : t.taskovi.dodan);
      formRef.current?.reset();
      setPriority("m");
      onOpenChange(false);
    });
  }

  function onDelete() {
    if (!task) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("taskId", task.id);
      const res = await deleteTask(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t.taskovi.obrisan);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{editing ? t.taskovi.uredi : t.taskovi.noviTask}</DialogTitle>
        <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">{t.taskovi.naziv}</Label>
            <Input
              id="task-title"
              name="title"
              required
              autoFocus
              autoComplete="off"
              defaultValue={task?.title ?? ""}
              placeholder={t.taskovi.nazivPlaceholder}
            />
          </div>

          {!projectId && projects && projects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="task-project">{t.nav.projekti}</Label>
              <select
                id="task-project"
                name="projectId"
                defaultValue={task?.project_id ?? ""}
                className={selectCls}
              >
                <option value="">{t.taskovi.bezProjekta}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.naziv}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-due">{t.common.rok}</Label>
            <Input id="task-due" name="due" type="date" defaultValue={task?.due ?? ""} />
          </div>

          {editing && (
            <div className="space-y-1.5">
              <Label htmlFor="task-status">{t.common.status}</Label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.taskovi.kolone[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t.taskovi.prioritet}</Label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm capitalize transition",
                    priority === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  {t.prioritet[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
                className={cn(
                  "text-muted-foreground hover:text-red-600",
                  confirmDelete && "text-red-600",
                )}
              >
                <Trash2 className="size-3.5" />
                {confirmDelete ? t.taskovi.potvrdiBrisanje : t.common.obrisi}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.common.odustani}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {t.common.spremi}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
