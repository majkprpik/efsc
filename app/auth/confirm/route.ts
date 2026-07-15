import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Odredište magic linka: razmjenjuje token_hash za sesiju, pa preusmjerava. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/portal";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL("/portal/login?error=Neispravan link.", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/portal/login?error=${encodeURIComponent("Link je istekao ili je već iskorišten.")}`,
        request.url,
      ),
    );
  }

  // Otvoreni redirect: `next` dolazi iz URL-a, pa dopuštamo samo interne putanje.
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/portal";
  return NextResponse.redirect(new URL(dest, request.url));
}
