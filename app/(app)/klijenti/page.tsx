import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared";
import {
  KlijentiView,
  type Klijent,
  type KlijentProjekt,
  type KlijentNatjecaj,
  type KlijentFinancija,
} from "./KlijentiView";

export default async function KlijentiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: clientRows }, { data: projRows }, { data: finRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, naziv, contact, email, phone, status, tags, folder_path")
      .in("status", ["active", "inactive"])
      .order("naziv"),
    supabase
      .from("projects")
      .select("id, client_id, naziv, status, color, rok, natjecaji(id, naziv, status, rok)")
      .not("client_id", "is", null),
    supabase
      .from("finances")
      .select("id, client_id, descr, amount, type, datum, status")
      .order("datum", { ascending: false }),
  ]);

  const clients: Klijent[] = (clientRows ?? []).map((c) => ({
    id: c.id,
    naziv: c.naziv,
    contact: c.contact,
    email: c.email,
    phone: c.phone,
    status: c.status,
    tags: c.tags ?? [],
    folder_path: c.folder_path,
  }));

  const projects: KlijentProjekt[] = [];
  const natjecaji: KlijentNatjecaj[] = [];
  const seenNat = new Set<string>(); // dedupe natjecaji per client
  (projRows ?? []).forEach((p) => {
    if (!p.client_id) return;
    projects.push({
      id: p.id,
      client_id: p.client_id,
      naziv: p.naziv,
      status: p.status,
      color: p.color,
      rok: p.rok,
    });
    const n = p.natjecaji as { id: string; naziv: string; status: string; rok: string | null } | null;
    if (n) {
      const key = `${p.client_id}:${n.id}`;
      if (!seenNat.has(key)) {
        seenNat.add(key);
        natjecaji.push({ client_id: p.client_id, id: n.id, naziv: n.naziv, status: n.status, rok: n.rok });
      }
    }
  });

  const finances: KlijentFinancija[] = (finRows ?? [])
    .filter((f) => f.client_id)
    .map((f) => ({
      id: f.id,
      client_id: f.client_id as string,
      descr: f.descr,
      amount: f.amount,
      type: f.type,
      datum: f.datum,
      status: f.status,
    }));

  return (
    <>
      <PageHeader section="klijenti" title="Klijenti" />
      <KlijentiView
        clients={clients}
        projects={projects}
        natjecaji={natjecaji}
        finances={finances}
        initialId={sp.id}
      />
    </>
  );
}
