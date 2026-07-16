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
  // Goli datum ("2026-05-18") čitamo kao lokalni, inače ga UTC pomakne dan
  // unatrag. Timestamp ("2026-05-18T06:30:00+00") već nosi vrijeme i zonu —
  // njemu se T00:00:00 ne smije dodati, jer daje Invalid Date i "NaN.NaN.".
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function eur(n: number): string {
  return n.toLocaleString("hr-HR");
}
