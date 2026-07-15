"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Standardni set dokumenata koji se traži od gotovo svakog klijenta.
 * Tim ovo prilagodi po klijentu — ovo je samo početna točka.
 */
const DEFAULT_ITEMS: { name: string; description: string }[] = [
  { name: "Izvod iz sudskog registra", description: "Ne stariji od 3 mjeseca" },
  { name: "Financijski izvještaj (GFI)", description: "Zadnja poslovna godina" },
  { name: "Potvrda Porezne uprave", description: "O nepostojanju duga, ne starija od 30 dana" },
  { name: "Bilanca i RDG", description: "Zadnje dvije godine" },
  { name: "Izjava o veličini poduzeća", description: "Potpisana i ovjerena" },
];

/** Dodaj stavku na klijentovu checklistu. */
export async function addRequest(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!clientId || !name) return { error: "Nedostaje naziv." };

  const { error } = await supabase.from("portal_requests").insert({
    client_id: clientId,
    name,
    description: description || null,
    required: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/portal-admin");
  return { ok: true };
}

/** Napuni checklistu standardnim setom. */
export async function seedRequests(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { error: "Nedostaje klijent." };

  const { data: existing } = await supabase
    .from("portal_requests")
    .select("name")
    .eq("client_id", clientId);

  const have = new Set((existing ?? []).map((r) => r.name));
  const rows = DEFAULT_ITEMS.filter((i) => !have.has(i.name)).map((i, idx) => ({
    client_id: clientId,
    name: i.name,
    description: i.description,
    required: true,
    sort: idx,
  }));

  if (rows.length === 0) return { ok: true, added: 0 };

  const { error } = await supabase.from("portal_requests").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/portal-admin");
  return { ok: true, added: rows.length };
}

export async function deleteRequest(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nedostaje stavka." };

  await supabase.from("portal_requests").delete().eq("id", id);
  revalidatePath("/portal-admin");
  return { ok: true };
}

/**
 * Pošalji klijentu pozivnicu na portal.
 *
 * Račun se ne stvara ovdje — signInWithOtp s shouldCreateUser radi i prijavu i
 * prvu registraciju. Profil se veže na klijenta preko trigger-a niže; ako
 * profil već postoji, samo mu postavimo rolu i client_id.
 */
export async function invitePortalUser(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("clientId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!clientId || !email) return { error: "Nedostaje e-mail." };

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/confirm?next=/portal`,
      // Pokupi ih trigger handle_new_user pri stvaranju profila.
      data: { portal_client_id: clientId, portal_role: "client" },
    },
  });

  if (error) return { error: error.message };

  // Ako korisnik već postoji, gornji poziv ne dira metapodatke — poveži ručno.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("profiles")
      .update({ role: "client", client_id: clientId })
      .eq("id", existing.id);
  }

  revalidatePath("/portal-admin");
  return { ok: true };
}
