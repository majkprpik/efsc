import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EntityKind =
  | "natjecaj"
  | "klijent"
  | "potencijalni"
  | "projekt"
  | "task"
  | "rok"
  | "financije";

export const ENTITY_LABEL: Record<EntityKind, string> = {
  natjecaj: "natječaju",
  klijent: "klijentu",
  potencijalni: "potencijalnom klijentu",
  projekt: "projektu",
  task: "zadatku",
  rok: "roku",
  financije: "financijama",
};

/** Entities whose chat is global (no per-item id). */
const GLOBAL_KINDS = new Set<EntityKind>(["financije"]);

export function isEntityKind(v: unknown): v is EntityKind {
  return typeof v === "string" && v in ENTITY_LABEL;
}

export function requiresId(kind: EntityKind): boolean {
  return !GLOBAL_KINDS.has(kind);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function line(label: string, val: unknown): string {
  return val === null || val === undefined || val === "" ? "" : `${label}: ${val}\n`;
}

/** Build a compact textual summary of an entity for the AI system prompt. */
export async function buildEntityContext(kind: EntityKind, id: string | null): Promise<string> {
  const supabase = await createClient();

  if (kind === "natjecaj" && id) {
    const { data: n } = await supabase.from("natjecaji").select("*").eq("id", id).single();
    if (!n) return "Natječaj nije pronađen.";
    const [{ data: projs }, { data: docs }] = await Promise.all([
      supabase.from("projects").select("naziv, status, progress, clients(naziv)").eq("natjecaj_id", id),
      supabase.from("natjecaj_docs").select("filename").eq("natjecaj_id", id),
    ]);
    let s = `# Natječaj: ${n.naziv}\n`;
    s += line("Tijelo", n.tijelo);
    s += line("Iznos", n.iznos);
    s += line("Sufinanciranje", n.sufinanciranje);
    s += line("Rok prijave", n.rok);
    s += line("Status", n.status);
    s += line("Tagovi", n.tags?.join(", "));
    if (projs?.length) {
      s += `\nProjekti/klijenti pod natječajem:\n`;
      projs.forEach((p) => {
        const c = p.clients as { naziv: string } | null;
        s += `- ${p.naziv} (${c?.naziv ?? "—"}), status ${p.status}, ${p.progress}%\n`;
      });
    }
    if (docs?.length) s += `\nDokumentacija natječaja: ${docs.map((d) => d.filename).join(", ")}\n`;
    return s;
  }

  if (kind === "klijent" && id) {
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
    if (!c) return "Klijent nije pronađen.";
    const [{ data: projs }, { data: fin }] = await Promise.all([
      supabase.from("projects").select("naziv, status, progress, rok, natjecaji(naziv)").eq("client_id", id),
      supabase.from("finances").select("descr, amount, type, status").eq("client_id", id),
    ]);
    let s = `# Klijent: ${c.naziv}\n`;
    s += line("Kontakt", c.contact);
    s += line("Email", c.email);
    s += line("Telefon", c.phone);
    s += line("Status", c.status);
    s += line("Tagovi", c.tags?.join(", "));
    if (projs?.length) {
      s += `\nProjekti:\n`;
      projs.forEach((p) => {
        const n = p.natjecaji as { naziv: string } | null;
        s += `- ${p.naziv}, status ${p.status}, ${p.progress}%, rok ${p.rok ?? "—"}${n ? `, natječaj: ${n.naziv}` : ""}\n`;
      });
    }
    if (fin?.length) {
      s += `\nFinancije:\n`;
      fin.forEach((f) => {
        s += `- ${f.descr}: ${f.type === "inc" ? "+" : "-"}${f.amount} EUR (${f.status})\n`;
      });
    }
    return s;
  }

  if (kind === "potencijalni" && id) {
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
    if (!c) return "Potencijalni klijent nije pronađen.";
    const { data: notes } = await supabase
      .from("client_notes")
      .select("author, text, ts_label")
      .eq("client_id", id)
      .order("created_at");
    let s = `# Potencijalni klijent: ${c.naziv}\n`;
    s += line("Kontakt", c.contact);
    s += line("Telefon", c.phone);
    s += line("Zadnji kontakt", c.zadnji_kontakt);
    s += line("AI sažetak ideje", c.saz);
    if (notes?.length) {
      s += `\nBilješke:\n`;
      notes.forEach((n) => (s += `- [${n.author}] ${n.text}\n`));
    }
    return s;
  }

  if (kind === "projekt" && id) {
    const { data: p } = await supabase
      .from("projects")
      .select("*, clients(naziv), natjecaji(naziv)")
      .eq("id", id)
      .single();
    if (!p) return "Projekt nije pronađen.";
    const [{ data: docs }, { data: tasks }] = await Promise.all([
      supabase.from("project_docs").select("name, uploaded, note").eq("project_id", id),
      supabase.from("tasks").select("title, status, assignee_name, due").eq("project_id", id),
    ]);
    const c = p.clients as { naziv: string } | null;
    const n = p.natjecaji as { naziv: string } | null;
    let s = `# Projekt: ${p.naziv}\n`;
    s += line("Klijent", c?.naziv);
    s += line("Natječaj", n?.naziv);
    s += line("Status", p.status);
    s += line("Napredak", `${p.progress}%`);
    s += line("Rok", p.rok);
    s += line("Vrijednost", p.value);
    if (docs?.length) {
      s += `\nDokumentacija (checklist):\n`;
      docs.forEach((d) => (s += `- ${d.name}: ${d.uploaded ? "uploadano" : `NEDOSTAJE${d.note ? ` (${d.note})` : ""}`}\n`));
    }
    if (tasks?.length) {
      s += `\nZadaci:\n`;
      tasks.forEach((t) => (s += `- ${t.title} [${t.status}], ${t.assignee_name ?? "—"}, rok ${t.due ?? "—"}\n`));
    }
    return s;
  }

  if (kind === "financije") {
    const { data: fin } = await supabase
      .from("finances")
      .select("descr, amount, type, status, datum, clients(naziv)")
      .order("datum", { ascending: false });
    const rows = fin ?? [];
    const inc = rows.filter((f) => f.type === "inc").reduce((a, f) => a + Number(f.amount), 0);
    const exp = rows.filter((f) => f.type === "exp").reduce((a, f) => a + Number(f.amount), 0);
    const late = rows.filter((f) => f.status === "kasni").reduce((a, f) => a + Number(f.amount), 0);
    let s = `# Financije (pregled)\nUkupno prihodi: ${inc} EUR\nTroškovi: ${exp} EUR\nDospjelo (kasni): ${late} EUR\n\nTransakcije:\n`;
    rows.forEach((f) => {
      const c = f.clients as { naziv: string } | null;
      s += `- ${f.descr} (${c?.naziv ?? "—"}): ${f.type === "inc" ? "+" : "-"}${f.amount} EUR, ${f.status}, ${f.datum}\n`;
    });
    return s;
  }

  return "Nema dostupnog konteksta za ovaj entitet.";
}
