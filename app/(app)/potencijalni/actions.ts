"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createNote(formData: FormData) {
  const supabase = await createClient();

  const clientId = String(formData.get("clientId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!clientId) return { error: "Nedostaje klijent." };
  if (!text) return { error: "Bilješka je prazna." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("initials, name").eq("id", user.id).single()
    : { data: null };

  // `author` shows up in the bubble avatar; "AI" is reserved for generated notes.
  const author = profile?.initials || profile?.name?.slice(0, 2).toUpperCase() || "AK";

  // Existing labels look like "16.5. 14:32".
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tsLabel = `${now.getDate()}.${now.getMonth() + 1}. ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    text,
    author,
    ts_label: tsLabel,
  });
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/potencijalni");
  revalidatePath("/klijenti");
  return { ok: true };
}
