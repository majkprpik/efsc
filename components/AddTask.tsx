"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/TaskDialog";
import { useT } from "@/lib/i18n/client";

export function AddTaskButton({
  projectId,
  projects,
  label,
}: {
  /** Fixed project — when set, no picker is shown. */
  projectId?: string;
  /** Selectable projects, for contexts without a fixed project. */
  projects?: { id: string; naziv: string }[];
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label ?? t.taskovi.dodajTask}
      </Button>
      {open && (
        <TaskDialog projectId={projectId} projects={projects} open onOpenChange={setOpen} />
      )}
    </>
  );
}
