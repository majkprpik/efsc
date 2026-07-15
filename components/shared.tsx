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
      <h1 className="flex-1 text-lg font-semibold tracking-tight">{title}</h1>
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

const ESF_LIGHT = "#4CAEEE";
const ESF_BLUE = "#0B6EF5";

// The mark's inner window is a real hole punched through both squares, so the
// spinner reads correctly on the sidebar, a card, or the page. The mask is
// identical for every instance, so a single fixed id is safe to share.
const ESF_MASK_ID = "esf-knockout";

/** ESF mark rebuilt as inline SVG so the loader costs no network request. */
export function Spinner({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="status"
      aria-label="Učitavanje"
    >
      <defs>
        <mask id={ESF_MASK_ID}>
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <rect x="28" y="34" width="38" height="32" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${ESF_MASK_ID})`}>
        {/* speech bubble, behind and lower-left */}
        <g className="esf-spin-back">
          <path
            d="M6 34 h56 a4 4 0 0 1 4 4 v34 a4 4 0 0 1 -4 4 h-24 l-10 8 v-8 h-22 a4 4 0 0 1 -4 -4 v-34 a4 4 0 0 1 4 -4 z"
            fill={ESF_LIGHT}
            className="esf-spin-tail"
          />
        </g>
        {/* solid square, in front and upper-right */}
        <g className="esf-spin-front">
          <rect x="28" y="14" width="52" height="52" rx="4" fill={ESF_BLUE} />
        </g>
      </g>
    </svg>
  );
}

/** Full-panel loading state. Use inside a detail pane or as a page fallback. */
export function Loading({ label = "Učitavanje…" }: { label?: string }) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4">
      <Spinner size={44} />
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}
