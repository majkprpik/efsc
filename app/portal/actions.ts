"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { docKindFromName, extractText } from "@/lib/extract";
import { getT } from "@/lib/i18n/server";
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
    .select("id, name, email, client_id, role")
    .eq("id", claims.sub)
    .single();

  if (!profile?.client_id) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, naziv, folder_path, submitted_at")
    .eq("id", profile.client_id)
    .single();

  if (!client) return null;

  const { data: items } = await supabase
    .from("portal_requests")
    .select(
      "id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note, uploaded_by, uploaded_by_name, sort",
    )
    .eq("client_id", client.id)
    .order("sort")
    .order("created_at");

  return { profile, client, items: items ?? [] };
}

/**
 * Klijent i njegova checklista, ali dohvaćeno za člana tima.
 *
 * Isti oblik kao getPortalContext, pa ga upload može gutati bez razlike —
 * razlika je samo tko smije: ovdje mora biti tim, tamo baš taj klijent.
 */
async function getTeamContext(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, client_id, role")
    .eq("id", claims.sub)
    .single();

  // Klijent ne smije ovuda ni na svoj portal: tuđi clientId bi mu inače dao
  // upload u tuđe ime. Za klijenta postoji getPortalContext.
  if (!profile || profile.client_id) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, naziv, folder_path, submitted_at")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  const { data: items } = await supabase
    .from("portal_requests")
    .select(
      "id, name, description, required, uploaded, uploaded_at, original_name, ai_status, ai_note, uploaded_by, uploaded_by_name, sort",
    )
    .eq("client_id", client.id)
    .order("sort")
    .order("created_at");

  return { profile, client, items: items ?? [] };
}

type PortalCtx = NonNullable<Awaited<ReturnType<typeof getPortalContext>>>;

/**
 * Jezgra uploada, zajednička klijentu i timu.
 *
 * `by` je jedina razlika i ide ravno u zapis: dokument koji je poslao tim mora
 * se dati razlikovati od klijentovog i kasnije, kad se nitko ne sjeća tko je
 * što slao. Portal tu oznaku i pokazuje klijentu.
 */
async function doUpload(
  ctx: PortalCtx,
  formData: FormData,
  by: { kind: "client" } | { kind: "team"; name: string },
) {
  const supabase = await createClient();
  const t = await getT();

  const file = formData.get("file") as File | null;
  const requestId = String(formData.get("requestId") ?? "");
  if (!file || file.size === 0) return { error: t.portal.nedostajeDatoteka };

  if (file.size > 25 * 1024 * 1024) {
    return { error: t.portal.prevelikaDatoteka };
  }

  // Stavka mora pripadati ovom klijentu — inače bi podmetnuti requestId
  // prepisao tuđi red. (Demo RLS je širok, pa provjera mora biti ovdje.)
  if (requestId) {
    const owned = ctx.items.some((i) => i.id === requestId);
    if (!owned) return { error: t.portal.nepoznataStavka };
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
  if (upErr) return { error: t.portal.uploadNijeUspio.replace("{msg}", upErr.message) };

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
  const by_ = {
    uploaded_by: by.kind,
    uploaded_by_name: by.kind === "team" ? by.name : null,
  };

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
        ...by_,
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
      ...by_,
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

  // Novi dokument znači da klijent opet nešto mijenja — ranija predaja više ne
  // stoji. Bez ovoga bi tim gledao "predano" nad hrpom koja se još miješa.
  if (ctx.client.submitted_at) {
    await supabase.from("clients").update({ submitted_at: null }).eq("id", ctx.client.id);
  }

  revalidatePath("/portal");
  revalidatePath("/klijenti");
  revalidatePath(`/portal-admin/pregled/${ctx.client.id}`);
  return { ok: true, status: aiStatus, note: aiNote };
}

/**
 * Klijent uploada dokument za jednu stavku checkliste.
 *
 * requestId je opcionalan: ako ga nema, AI pokušava sam pogoditi kamo spada.
 */
export async function uploadPortalDoc(formData: FormData) {
  const t = await getT();
  const ctx = await getPortalContext();
  if (!ctx) return { error: t.portal.nemasPristup };

  return doUpload(ctx, formData, { kind: "client" });
}

/**
 * Tim uploada dokument u klijentovo ime — klijent pošalje papire mailom, mi ih
 * ubacimo umjesto njega.
 *
 * Zapis nosi tko je stvarno slao; portal to klijentu i pokaže. Bez toga bi mu
 * pisalo "dostavljeno" za nešto što nikad nije poslao.
 */
export async function uploadPortalDocAsTeam(clientId: string, formData: FormData) {
  const t = await getT();
  const ctx = await getTeamContext(clientId);
  if (!ctx) return { error: t.portal.nemasPristup };

  return doUpload(ctx, formData, {
    kind: "team",
    name: ctx.profile.name || ctx.profile.email,
  });
}

/**
 * Klijent javlja da je gotov s dostavom.
 *
 * Ne zaključava upload: predaja je poruka timu, a ne kraj. Klijent koji se sjeti
 * još jednog papira treba ga moći poslati bez da nas zove da mu otključamo.
 */
export async function submitPortal() {
  const supabase = await createClient();
  const t = await getT();

  const ctx = await getPortalContext();
  if (!ctx) return { error: t.portal.nemasPristup };

  // Gumb se ionako ne prikaže dok nešto fali, ali klijent može poslati poziv i
  // izravno — a i lista se mogla promijeniti otkad je stranica renderirana.
  const missing = ctx.items.filter((i) => i.required && !i.uploaded);
  if (missing.length) {
    return {
      error: t.portal.josNedostaje.replace("{items}", missing.map((i) => i.name).join(", ")),
    };
  }

  const { error } = await supabase
    .from("clients")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", ctx.client.id);
  if (error) return { error: t.portal.predajaNijeUspjela };

  revalidatePath("/portal");
  revalidatePath("/klijenti");
  return { ok: true };
}

/** Klijent se sjetio da mora još nešto — vraća dostavu u tijek. */
export async function unsubmitPortal() {
  const supabase = await createClient();
  const t = await getT();

  const ctx = await getPortalContext();
  if (!ctx) return { error: t.portal.nemasPristup };

  await supabase.from("clients").update({ submitted_at: null }).eq("id", ctx.client.id);

  revalidatePath("/portal");
  revalidatePath("/klijenti");
  return { ok: true };
}
