"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link prijava za klijente. Namjerno bez lozinke: klijent se javi jednom
 * u par mjeseci i lozinku bi svejedno resetirao.
 */
export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/portal/login?error=Upiši e-mail adresu.");
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // shouldCreateUser: false — portal je samo za klijente koje je tim već
      // unio. Inače bi bilo tko s ove stranice napravio sebi račun.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm?next=/portal`,
    },
  });

  if (error) {
    redirect(`/portal/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/portal/login?message=Poslali smo ti link za prijavu na mail.");
}
