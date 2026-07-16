import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/shared";
import { NatjecajiView, type ProjRow } from "./NatjecajiView";

export default async function NatjecajiPage() {
  const t = await getT();
  const supabase = await createClient();

  const [{ data: natjecaji }, { data: projRows }, { data: docs }] = await Promise.all([
    supabase
      .from("natjecaji")
      .select("id, naziv, status, rok, tijelo, iznos, sufinanciranje, tags, folder_path, nat_folder_path")
      .order("status", { ascending: true })
      .order("rok", { ascending: true, nullsFirst: false }),
    supabase
      .from("projects")
      .select("id, natjecaj_id, naziv, progress, color, status, clients(naziv)"),
    supabase.from("natjecaj_docs").select("id, natjecaj_id, filename").order("filename"),
  ]);

  const projects: ProjRow[] = (projRows ?? []).map((p) => ({
    id: p.id,
    natjecaj_id: p.natjecaj_id,
    naziv: p.naziv,
    progress: p.progress,
    color: p.color,
    status: p.status,
    clientNaziv: (p.clients as { naziv: string } | null)?.naziv ?? null,
  }));

  return (
    <>
      <PageHeader section="natjecaji" title={t.nav.natjecaji} />
      <NatjecajiView natjecaji={natjecaji ?? []} projects={projects} docs={docs ?? []} />
    </>
  );
}
