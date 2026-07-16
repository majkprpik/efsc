import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/shared";
import { ProjektiView, type Projekt, type ProjDoc, type ProjTask } from "./ProjektiView";

export default async function ProjektiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await createClient();

  // Everything the master-detail needs, fetched once. Switching projects is
  // then pure client state — no request per click.
  const [{ data: projRows }, { data: docRows }, { data: taskRows }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, naziv, status, progress, color, rok, value, folder_path, clients(naziv), natjecaji(id, naziv)",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("project_docs")
      .select("id, project_id, name, uploaded, storage_path, note, uploaded_at")
      .order("sort"),
    supabase.from("tasks").select("id, project_id, title, status, assignee_name, due").order("due"),
  ]);

  const projects: Projekt[] = (projRows ?? []).map((p) => ({
    id: p.id,
    naziv: p.naziv,
    status: p.status,
    progress: p.progress,
    color: p.color,
    rok: p.rok,
    value: p.value,
    folder_path: p.folder_path,
    clientNaziv: (p.clients as { naziv: string } | null)?.naziv ?? null,
    natjecaj: (p.natjecaji as { id: string; naziv: string } | null) ?? null,
  }));

  return (
    <>
      <PageHeader section="projekti" title={t.nav.projekti} />
      <ProjektiView
        projects={projects}
        docs={(docRows ?? []) as ProjDoc[]}
        tasks={(taskRows ?? []) as ProjTask[]}
        initialId={sp.id}
      />
    </>
  );
}
