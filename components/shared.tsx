import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="flex-1 font-serif text-xl tracking-tight">{title}</h1>
      {children}
    </header>
  );
}

const STATUS_VARIANT: Record<string, string> = {
  Aktivan: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  aktivan: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "U pripremi": "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Kasni: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  Završen: "border-transparent bg-muted text-muted-foreground",
  zatvoren: "border-transparent bg-muted text-muted-foreground",
  arhiva: "border-transparent bg-muted text-muted-foreground",
  potencijalni: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn(STATUS_VARIANT[status] ?? "bg-muted text-muted-foreground", className)}>
      {status}
    </Badge>
  );
}

export function PriorityBadge({ p }: { p: "h" | "m" | "l" }) {
  const map = {
    h: ["bg-red-500/15 text-red-700 dark:text-red-400", "hitno"],
    m: ["bg-amber-500/15 text-amber-700 dark:text-amber-400", "visok"],
    l: ["bg-muted text-muted-foreground", "nizak"],
  } as const;
  const [cls, label] = map[p];
  return <Badge className={cn("border-transparent", cls)}>{label}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}
