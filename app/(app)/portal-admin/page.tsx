import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared";
import { PortalAdminView, type AdminClient } from "./PortalAdminView";

export default async function PortalAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: clientRows }, { data: reqRows }, { data: profileRows }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, naziv, email, status")
        .order("naziv"),
      supabase
        .from("portal_requests")
        .select(
          "id, client_id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note, sort",
        )
        .order("sort")
        .order("created_at"),
      supabase
        .from("profiles")
        .select("id, email, name, client_id")
        .eq("role", "client"),
    ]);

  const clients: AdminClient[] = (clientRows ?? []).map((c) => ({
    id: c.id,
    naziv: c.naziv,
    email: c.email,
    status: c.status,
    users: (profileRows ?? [])
      .filter((p) => p.client_id === c.id)
      .map((p) => ({ id: p.id, email: p.email, name: p.name })),
    requests: (reqRows ?? [])
      .filter((r) => r.client_id === c.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        required: r.required,
        uploaded: r.uploaded,
        uploaded_at: r.uploaded_at,
        original_name: r.original_name,
        ai_status: r.ai_status,
        ai_note: r.ai_note,
      })),
  }));

  return (
    <>
      <PageHeader title="Klijentski portal" />
      <PortalAdminView clients={clients} initialId={sp.id} />
    </>
  );
}
