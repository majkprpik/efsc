import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Rolu pročitaj prije odjave — poslije je sesija prazna i klijent bi završio
  // na timskoj prijavi, gdje se ionako ne može prijaviti.
  const { data } = await supabase.auth.getClaims();
  const role = (data?.claims?.app_metadata as { role?: string } | undefined)?.role;

  await supabase.auth.signOut();

  const dest = role === "client" ? "/portal/login" : "/login";
  return NextResponse.redirect(new URL(dest, request.url), { status: 303 });
}
