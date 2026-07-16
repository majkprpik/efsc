"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setTaskStatus } from "@/app/(app)/taskovi/actions";
import { cn } from "@/lib/utils";

/** Toggles a task between done and todo. */
export function TaskCheckbox({ taskId, status }: { taskId: string; status: string }) {
  const [pending, start] = useTransition();
  const done = status === "done";

  function toggle() {
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("status", done ? "todo" : "done");
    start(async () => {
      const res = await setTaskStatus(fd);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={done}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border transition",
        done
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-muted-foreground/40 hover:border-muted-foreground",
      )}
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        done && <Check className="size-3" strokeWidth={3} />
      )}
    </button>
  );
}
