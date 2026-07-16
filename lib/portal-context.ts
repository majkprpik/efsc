import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Kontekst za portal chat — sve što AI smije znati o klijentu koji pita.
 *
 * Namjerno odvojeno od buildEntityContext(): ondje je pravilo "tim vidi sve",
 * ovdje "klijent vidi samo svoje". Kad bi dijelili kod, prvo šire polje koje
 * netko doda internom pregledu procurilo bi na portal bez ijedne izmjene ovdje.
 * Financije i bilješke se ne uključuju ni pod čim — klijent ih u portalu ne vidi.
 */
export async function buildPortalContext(clientId: string): Promise<string> {
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("clients")
    .select("naziv, submitted_at")
    .eq("id", clientId)
    .single();
  if (!c) return "Klijent nije pronađen.";

  const [{ data: items }, { data: projs }] = await Promise.all([
    supabase
      .from("portal_requests")
      .select("name, description, required, uploaded, original_name, ai_status, ai_note")
      .eq("client_id", clientId)
      .order("sort")
      .order("created_at"),
    supabase
      .from("projects")
      .select("id, naziv, status, rok, natjecaji(naziv)")
      .eq("client_id", clientId),
  ]);

  let s = `# Klijent: ${c.naziv}\n`;
  s += `Status dostave: ${c.submitted_at ? "klijent je označio da je gotov" : "u tijeku"}\n`;

  const required = (items ?? []).filter((i) => i.required);
  const extra = (items ?? []).filter((i) => !i.required);

  if (required.length) {
    const done = required.filter((i) => i.uploaded).length;
    s += `\nTražena dokumentacija (${done}/${required.length} dostavljeno):\n`;
    required.forEach((i) => {
      s += `- ${i.name}${i.description ? ` — ${i.description}` : ""}: `;
      s += i.uploaded ? `dostavljeno (${i.original_name ?? "—"})` : "NEDOSTAJE";
      if (i.uploaded && i.ai_status === "issue" && i.ai_note) s += ` [napomena: ${i.ai_note}]`;
      s += "\n";
    });
  } else {
    s += "\nTrenutno nema traženih dokumenata.\n";
  }

  if (extra.length) {
    s += `\nDodatno poslano: ${extra.map((i) => i.name).join(", ")}\n`;
  }

  if (projs?.length) {
    // Rokovi su vezani na projekt, pa ih dohvaćamo tek kad projekata ima.
    const { data: deadlines } = await supabase
      .from("deadlines")
      .select("text, datum, project_id")
      .in(
        "project_id",
        projs.map((p) => p.id),
      )
      .order("datum");

    s += `\nProjekti:\n`;
    projs.forEach((p) => {
      const n = p.natjecaji as { naziv: string } | null;
      s += `- ${p.naziv}${n ? ` (natječaj: ${n.naziv})` : ""}, rok ${p.rok ?? "—"}\n`;
      (deadlines ?? [])
        .filter((d) => d.project_id === p.id)
        .forEach((d) => (s += `  · ${d.text}: ${d.datum}\n`));
    });
  }

  return s;
}
