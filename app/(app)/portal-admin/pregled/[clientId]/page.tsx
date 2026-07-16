import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PortalChecklist, type ChecklistItem } from "@/components/PortalChecklist";
import { PortalChatPanel, PortalChatMobileNote } from "@/components/PortalChat";

/**
 * Timski pregled: klijentov portal onakav kakav ga on vidi, i s uploadom.
 *
 * Upload radi jer klijenti papire često pošalju mailom pa ih netko iz tima ubaci
 * umjesto njih. Ono što ne radi je predaja dokumentacije — to je klijentova
 * izjava da je gotov i nitko je ne može dati u njegovo ime.
 *
 * Svaki upload odavde nosi ime osobe koja ga je poslala i klijent tu oznaku vidi
 * na svom portalu; ekran je vjeran, zapis nije lažan.
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
    .select("id, naziv, submitted_at")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  const { data: rows } = await supabase
    .from("portal_requests")
    .select(
      "id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note, uploaded_by, uploaded_by_name",
    )
    .eq("client_id", clientId)
    .order("sort")
    .order("created_at");

  const items = (rows ?? []) as ChecklistItem[];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
      <div className="flex shrink-0 items-center justify-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
        <Eye className="size-3.5" />
        Pregled — ovako portal vidi {client.naziv}. Što uploadaš ovdje njemu piše da si
        dostavio ti.
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
            <header className="mb-8">
              <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
                Orbit · esfc.hr
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.naziv}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Prijavljen kao klijent</p>
            </header>

            <PortalChecklist
              items={items}
              asTeam={client.id}
              submittedAt={client.submitted_at}
            />
          </div>
          <PortalChatMobileNote />
        </div>

        <PortalChatPanel asTeam={client.id} />
      </div>
    </div>
  );
}
