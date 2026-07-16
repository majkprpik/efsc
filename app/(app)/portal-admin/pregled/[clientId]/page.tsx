import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PortalChecklist, type ChecklistItem } from "@/components/PortalChecklist";

/**
 * Timski pregled: pokazuje klijentov portal točno kako ga on vidi, bez uploada.
 *
 * Read-only namjerno — tim ovdje gleda tuđi ekran, a ne šalje dokumente u
 * klijentovo ime. Za to služi /portal-admin.
 */
export default async function PortalPreviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, naziv")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  const { data: rows } = await supabase
    .from("portal_requests")
    .select(
      "id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note",
    )
    .eq("client_id", clientId)
    .order("sort")
    .order("created_at");

  const items = (rows ?? []) as ChecklistItem[];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
        <Eye className="size-3.5" />
        Pregled — ovako portal vidi {client.naziv}. Upload je onemogućen.
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
            Orbit · esfc.hr
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.naziv}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prijavljen kao klijent</p>
        </header>

        <PortalChecklist items={items} readOnly />
      </div>
    </div>
  );
}
