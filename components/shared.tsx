import type { ReactNode } from "react";
import {
  File as FileIcon,
  LayoutDashboard,
  Users,
  UserPlus,
  Trophy,
  Folder,
  ListChecks,
  Clock,
  Coins,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TopBarActions } from "@/components/TopBarActions";
import { DEFAULT_LOCALE, getDictionary, tStatus, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

/**
 * Each main section owns a colour and an icon. Links jump between sections
 * constantly (a project opens its tender, a tender lists its projects), so the
 * page needs to announce where you landed without you having to read the title.
 */
export const SECTION_ACCENTS: Record<
  string,
  { key: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "/": { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  "/klijenti": { key: "klijenti", label: "Klijenti", icon: Users },
  "/potencijalni": { key: "potencijalni", label: "Potencijalni", icon: UserPlus },
  "/natjecaji": { key: "natjecaji", label: "Natječaji", icon: Trophy },
  "/projekti": { key: "projekti", label: "Projekti", icon: Folder },
  "/taskovi": { key: "taskovi", label: "Taskovi", icon: ListChecks },
  "/rokovi": { key: "rokovi", label: "Rokovi", icon: Clock },
  "/financije": { key: "financije", label: "Financije", icon: Coins },
};

export function sectionOf(pathname: string) {
  if (pathname === "/") return SECTION_ACCENTS["/"];
  const hit = Object.keys(SECTION_ACCENTS).find((h) => h !== "/" && pathname.startsWith(h));
  return hit ? SECTION_ACCENTS[hit] : undefined;
}

export function PageHeader({
  title,
  section,
  children,
}: {
  title: string;
  /** Section key from SECTION_ACCENTS; colours the header for this page. */
  section?: string;
  children?: ReactNode;
}) {
  const accent = section ? SECTION_ACCENTS[`/${section}`] ?? SECTION_ACCENTS["/"] : undefined;
  const Icon = accent?.icon;

  // The hue comes from SectionShell, which wraps the whole page.
  return (
    <header className="section-header relative flex h-14 flex-shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      {Icon && (
        <span className="section-chip flex size-7 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" />
        </span>
      )}
      <h1 className="flex-1 text-lg font-semibold tracking-tight">{title}</h1>
      {children}
      <TopBarActions />
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

/**
 * `locale` is optional so this works in both server and client trees: client
 * callers pass it from useLocale(), server pages from the cookie. Without it
 * the raw database value shows, which is the Croatian original.
 */
export function StatusBadge({
  status,
  locale,
  className,
}: {
  status: string;
  locale?: Locale;
  className?: string;
}) {
  return (
    <Badge className={cn(STATUS_VARIANT[status] ?? "bg-muted text-muted-foreground", className)}>
      {locale ? tStatus(status, locale) : status}
    </Badge>
  );
}

export function PriorityBadge({ p, locale }: { p: "h" | "m" | "l"; locale?: Locale }) {
  const cls = {
    h: "bg-red-500/15 text-red-700 dark:text-red-400",
    m: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    l: "bg-muted text-muted-foreground",
  }[p];
  const label = getDictionary(locale ?? DEFAULT_LOCALE).prioritet[p];
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
export function Spinner({ className, size = 40, label }: { className?: string; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="status"
      aria-label={label ?? "Loading"}
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
export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4">
      <Spinner size={44} label={label} />
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

const DOC_TYPES: Record<string, { label: string; cls: string }> = {
  pdf: { label: "PDF", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  docx: { label: "Word", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  doc: { label: "Word", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  xlsx: { label: "Excel", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  xls: { label: "Excel", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  txt: { label: "Tekst", cls: "bg-muted text-muted-foreground" },
  csv: { label: "CSV", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  png: { label: "Slika", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  jpg: { label: "Slika", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  jpeg: { label: "Slika", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

const extOf = (fileName: string) => fileName.split(".").pop()?.toLowerCase() ?? "";

/** Human label for a file's type, e.g. "Word". Falls back to the extension. */
export function docLabel(fileName: string) {
  const ext = extOf(fileName);
  return DOC_TYPES[ext]?.label ?? ext.toUpperCase();
}

/** Type-coloured file icon. Tells PDF from Word at a glance. */
export function DocTypeIcon({ fileName, className }: { fileName: string; className?: string }) {
  const ext = extOf(fileName);
  const type = DOC_TYPES[ext];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4",
        type?.cls ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <FileIcon />
    </span>
  );
}
