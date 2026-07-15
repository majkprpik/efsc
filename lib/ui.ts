// Deterministic avatar color palette — ported from the reference mockup (`CP`/`cp`)
const CP: [string, string][] = [
  ["#E6F1FB", "#0C447C"],
  ["#EAF3DE", "#27500A"],
  ["#FAEEDA", "#633806"],
  ["#FCEBEB", "#791F1F"],
  ["#EEEDFE", "#3C3489"],
  ["#E1F5EE", "#085041"],
];

export function cp(s: string): [string, string] {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % CP.length;
  return CP[h];
}

export function ini(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

// Days between now and a target ISO date (negative = past)
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function urgency(days: number | null): "urg" | "warn" | "ok" {
  if (days === null) return "ok";
  if (days <= 3) return "urg";
  if (days <= 15) return "warn";
  return "ok";
}

// Croatian short date, e.g. 18.5.
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function eur(n: number): string {
  return n.toLocaleString("hr-HR");
}
