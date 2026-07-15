import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared";
import { PotencijalniView, type Potencijalni, type PotNote } from "./PotencijalniView";

export default async function PotencijalniPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: potRows } = await supabase
    .from("clients")
    .select("id, naziv, contact, phone, saz, zadnji_kontakt, unio_name")
    .eq("status", "potencijalni")
    .order("zadnji_kontakt", { ascending: false });

  const pot: Potencijalni[] = potRows ?? [];
  const ids = pot.map((p) => p.id);

  let notes: PotNote[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("client_notes")
      .select("id, client_id, author, text, ts_label")
      .in("client_id", ids)
      .order("created_at");
    notes = data ?? [];
  }

  return (
    <>
      <PageHeader title="Potencijalni klijenti" />
      <PotencijalniView pot={pot} notes={notes} initialId={sp.id} />
    </>
  );
}
