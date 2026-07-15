"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { docKindFromName, extractText } from "@/lib/extract";
import { matchDocument } from "@/lib/portal-ai";

const BUCKET = "orbit-docs";

/** Klijent i njegova checklista. null ako korisnik nije klijent. */
export async function getPortalContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, client_id, role")
    .eq("id", claims.sub)
    .single();

  if (!profile?.client_id) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, naziv, folder_path")
    .eq("id", profile.client_id)
    .single();

  if (!client) return null;

  const { data: items } = await supabase
    .from("portal_requests")
    .select(
      "id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note, sort",
    )
    .eq("client_id", client.id)
    .order("sort")
    .order("created_at");

  return { profile, client, items: items ?? [] };
}

/**
 * Klijent uploada dokument za jednu stavku checkliste.
 *
 * requestId je opcionalan: ako ga nema, AI pokušava sam pogoditi kamo spada.
 */
export async function uploadPortalDoc(formData: FormData) {
  const supabase = await createClient();

  const ctx = await getPortalContext();
  if (!ctx) return { error: "Nemaš pristup." };

  const file = formData.get("file") as File | null;
  const requestId = String(formData.get("requestId") ?? "");
  if (!file || file.size === 0) return { error: "Nedostaje datoteka." };

  if (file.size > 25 * 1024 * 1024) {
    return { error: "Datoteka je veća od 25 MB." };
  }

  // Stavka mora pripadati ovom klijentu — inače bi podmetnuti requestId
  // prepisao tuđi red. (Demo RLS je širok, pa provjera mora biti ovdje.)
  if (requestId) {
    const owned = ctx.items.some((i) => i.id === requestId);
    if (!owned) return { error: "Nepoznata stavka." };
  }

  const folder = (ctx.client.folder_path || `klijenti/${ctx.client.id}/`).replace(
    /\/+$/,
    "/",
  );
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${folder}portal/${Date.now()}_${safeName}`;

  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { upsert: true, contentType: file.type || undefined });
  if (upErr) return { error: `Upload nije uspio: ${upErr.message}` };

  const kind = docKindFromName(file.name);
  const text = await extractText(buf, kind);

  let targetId = requestId;
  let aiStatus: string | null = null;
  let aiNote: string | null = null;

  if (text.trim()) {
    // Sve tražene stavke, i one već ispunjene: klijent često šalje zamjenu za
    // dokument koji je odbijen ili je u međuvremenu istekao. Da ovdje nudimo
    // samo neispunjene, zamjena bi ispala "nepoznat dokument".
    const candidates = ctx.items.filter((i) => i.required);
    const match = await matchDocument(
      file.name,
      text,
      candidates.map((i) => ({ id: i.id, name: i.name, description: i.description })),
    );

    // AI smije pogoditi stavku samo kad je klijent nije sam odabrao.
    if (!targetId && match.requestId) targetId = match.requestId;
    aiStatus = match.status;
    aiNote = match.note || null;
  }

  const now = new Date().toISOString();

  if (targetId) {
    await supabase
      .from("portal_requests")
      .update({
        uploaded: true,
        storage_path: path,
        uploaded_at: now,
        original_name: file.name,
        ai_status: aiStatus,
        ai_note: aiNote,
      })
      .eq("id", targetId)
      .eq("client_id", ctx.client.id);
  } else {
    // Nije se dalo svrstati — spremi kao dodatnu stavku da dokument ne nestane.
    await supabase.from("portal_requests").insert({
      client_id: ctx.client.id,
      name: file.name,
      uploaded: true,
      required: false,
      storage_path: path,
      uploaded_at: now,
      original_name: file.name,
      ai_status: aiStatus,
      ai_note: aiNote,
      sort: 999,
    });
  }

  if (text.trim() && targetId) {
    await supabase
      .from("document_text")
      .delete()
      .eq("doc_kind", "portal")
      .eq("doc_id", targetId);
    await supabase.from("document_text").insert({
      doc_kind: "portal",
      doc_id: targetId,
      content: text,
      char_count: text.length,
    });
  }

  revalidatePath("/portal");
  revalidatePath("/klijenti");
  return { ok: true, status: aiStatus, note: aiNote };
}
