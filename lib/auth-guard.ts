import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Interne rute smije zvati samo tim, ne i klijent s portala.
 *
 * Proxy preusmjerava klijente s /* na /portal, ali /api/* namjerno preskače
 * (redirect bi API pozivu vratio HTML), pa provjera mora biti i ovdje.
 * Rola dolazi iz app_metadata — dio potpisanog JWT-a, korisnik je ne može mijenjati.
 */
export async function requireTeam(): Promise<{ sub: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const role = (claims.app_metadata as { role?: string } | undefined)?.role;
  if (role === "client") return null;

  return { sub: claims.sub as string };
}
