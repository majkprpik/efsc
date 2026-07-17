"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Jedina radnja dostupna neprijavljenom posjetitelju: ostaviti svoj mail.
 * Upis ide u public.access_requests (RLS pušta samo INSERT). Tim ga vidi u
 * Supabase dashboardu. Nema prijave, registracije ni magic linka.
 */
export async function requestAccess(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Gruba provjera oblika maila — jedino što se smije upisati.
  // Poruke se kodiraju jer Next redirect ide kroz HTTP header, a hrvatski
  // znakovi (č, ž, !) i razmaci u njemu ruše odgovor (ERR_INVALID_CHAR).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/pristup?error=${encodeURIComponent("Upiši ispravnu e-mail adresu.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("access_requests")
    .insert({ email });

  if (error) {
    redirect(`/pristup?error=${encodeURIComponent("Nešto je pošlo po zlu. Pokušaj ponovno.")}`);
  }

  redirect(`/pristup?message=${encodeURIComponent("Hvala! Javit ćemo ti se na taj mail.")}`);
}
