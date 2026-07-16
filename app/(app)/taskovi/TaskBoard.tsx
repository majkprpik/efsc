"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared";
import { TaskDialog } from "@/components/TaskDialog";
import { moveTask } from "@/app/(app)/taskovi/actions";
import { ini, shortDate } from "@/lib/ui";
import { useT, useLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const COLS = ["todo", "doing", "done"] as const;
type Status = (typeof COLS)[number];

export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: "h" | "m" | "l";
  due: string | null;
  assignee_name: string | null;
  sort: number;
  project_id: string | null;
  projectNaziv: string | null;
};

export function TaskBoard({
  tasks,
  projects,
}: {
  tasks: BoardTask[];
  projects: { id: string; naziv: string }[];
}) {
  const t = useT();
  const [, start] = useTransition();
  const [dragging, setDragging] = useState<BoardTask | null>(null);
  const [editing, setEditing] = useState<BoardTask | null>(null);

  // Server data is the source of truth; this only covers the gap between drop
  // and revalidation so the card doesn't snap back.
  const [optimistic, applyOptimistic] = useOptimistic(
    tasks,
    (state: BoardTask[], move: { id: string; status: Status; sort: number }) =>
      state.map((x) => (x.id === move.id ? { ...x, status: move.status, sort: move.sort } : x)),
  );

  const sensors = useSensors(
    // A few px of travel before a drag starts, so clicking a card still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const column = (col: Status) =>
    optimistic.filter((x) => x.status === col).sort((a, b) => a.sort - b.sort);

  function onDragStart(e: DragStartEvent) {
    setDragging(optimistic.find((x) => x.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;

    const task = optimistic.find((x) => x.id === active.id);
    if (!task) return;

    // Dropped on a column (empty area) or on another card?
    const overCol = COLS.find((c) => c === over.id);
    const overTask = optimistic.find((x) => x.id === over.id);
    const targetStatus = (overCol ?? (overTask?.status as Status)) ?? (task.status as Status);

    const siblings = column(targetStatus).filter((x) => x.id !== task.id);
    let index = siblings.length;
    if (overTask && overTask.id !== task.id) {
      const at = siblings.findIndex((x) => x.id === overTask.id);
      if (at !== -1) {
        // Dragging downward within the same column lands below the target.
        const movingDown = task.status === targetStatus && task.sort < overTask.sort;
        index = movingDown ? at + 1 : at;
      }
    }

    const above = siblings[index - 1];
    const below = siblings[index];
    if (task.status === targetStatus && above?.id !== undefined && below?.id === task.id) return;

    const nextSort =
      above && below
        ? (above.sort + below.sort) / 2
        : above
          ? above.sort + 1000
          : below
            ? below.sort - 1000
            : 1000;

    start(async () => {
      applyOptimistic({ id: task.id, status: targetStatus, sort: nextSort });
      const fd = new FormData();
      fd.set("taskId", task.id);
      fd.set("status", targetStatus);
      if (below) fd.set("beforeId", below.id);
      if (above) fd.set("afterId", above.id);
      const res = await moveTask(fd);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div data-tour="task-board" className="grid gap-4 md:grid-cols-3">
          {COLS.map((col) => (
            <Column key={col} col={col} tasks={column(col)} label={t.taskovi.kolone[col]}>
              {column(col).map((task, i) => (
                <Card key={task.id} task={task} col={col} index={i} onOpen={() => setEditing(task)} />
              ))}
            </Column>
          ))}
        </div>

        <DragOverlay>
          {dragging && <CardBody task={dragging} dragging />}
        </DragOverlay>
      </DndContext>

      {editing && (
        <TaskDialog
          task={editing}
          projects={projects}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}

function Column({
  col,
  tasks,
  label,
  children,
}: {
  col: Status;
  tasks: BoardTask[];
  label: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: col });

  return (
    <div data-tour={`task-col-${col}`} className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <SortableContext items={tasks.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-24 space-y-2 p-3 transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {tasks.length ? (
            children
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t.taskovi.praznoKratko}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function Card({
  task,
  col,
  index,
  onOpen,
}: {
  task: BoardTask;
  col: Status;
  index: number;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      data-tour={`task-card-${col}-${index}`}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <CardBody task={task} />
    </div>
  );
}

function CardBody({ task, dragging }: { task: BoardTask; dragging?: boolean }) {
  const locale = useLocale();
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-3",
        dragging ? "cursor-grabbing shadow-lg" : "hover:border-muted-foreground/40",
      )}
    >
      <div
        className={cn(
          "text-sm font-medium",
          task.status === "done" && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{task.projectNaziv ?? "—"}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
            {task.assignee_name ? ini(task.assignee_name) : "—"}
          </span>
          {shortDate(task.due)}
        </span>
        <PriorityBadge p={task.priority} locale={locale} />
      </div>
    </div>
  );
}
