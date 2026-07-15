import type { ReactNode } from "react";

export function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-b bg-bg px-7">
      <div className="flex-1 font-serif text-xl">{title}</div>
      {children}
    </div>
  );
}

const PROJECT_PILL: Record<string, string> = {
  Aktivan: "bg-[var(--grb)] text-green",
  "U pripremi": "bg-[var(--bb)] text-blue",
  Kasni: "bg-[var(--rb)] text-red",
  Završen: "bg-bg4 text-t3",
  aktivan: "bg-[var(--grb)] text-green",
  zatvoren: "bg-bg4 text-t3",
  arhiva: "bg-bg4 text-t3",
};

export function Pill({ status, className }: { status: string; className?: string }) {
  const style = PROJECT_PILL[status] ?? "bg-bg4 text-t3";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-medium ${style} ${className ?? ""}`}
    >
      {status}
    </span>
  );
}

export function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-20">
      <div className="mb-0.5 h-1 overflow-hidden rounded bg-bg4">
        <div className="h-full rounded" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="text-right text-[10px] text-t3">{value}%</div>
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--r)] border border-b bg-bg2">
      <div className="flex items-center justify-between border-b border-b px-[18px] py-3">
        <h3 className="text-[13px] font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-9 text-center text-[13px] text-t3">{children}</div>;
}

export function Avatar({
  text,
  bg,
  color,
  size = 32,
  radius = "50%",
}: {
  text: string;
  bg: string;
  color: string;
  size?: number;
  radius?: string;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center font-medium"
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        borderRadius: radius,
        fontSize: size < 30 ? 10 : size < 40 ? 11 : 16,
      }}
    >
      {text}
    </div>
  );
}
