import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and the auth call.
  // getClaims() verifies the JWT locally against the project's published keys
  // (this project signs with ES256), so it costs no round-trip to the Auth
  // server the way getUser() does — on every request, that was most of the wait.
  const {
    data: claims,
  } = await supabase.auth.getClaims();
  const user = claims?.claims;

  const { pathname } = request.nextUrl;

  // Točno /portal i /portal/*, ali NE /portal-admin — to je timska stranica.
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");

  // Aplikacija je zatvorena: neprijavljeni posjetitelj smije SAMO stranicu za
  // zahtjev pristupa (/pristup). Nema prijave, nema registracije, nema magic
  // linka — jedino polje za mail koje upis sprema u access_requests.
  const isPristup = pathname === "/pristup";

  if (!user && !isPristup) {
    const url = request.nextUrl.clone();
    url.pathname = "/pristup";
    return NextResponse.redirect(url);
  }

  // Klijenti vide samo portal; tim vidi samo Orbit. Rola je u app_metadata jer
  // je ona dio potpisanog JWT-a — čitanje iz profiles tablice ovdje bi značilo
  // upit na bazu na svaki request, što je upravo ono što getClaims() izbjegava.
  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  const isClient = role === "client";

  // API rute se ne preusmjeravaju — one same provjere tko zove i vrate JSON.
  // Redirect bi im vratio HTML login stranicu sa statusom 200.
  const isApi = pathname.startsWith("/api/");

  if (user && isClient && !isPortal && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  if (user && !isClient && isPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Prijavljeni koji sleti na /pristup ide na svoju početnu.
  if (user && pathname === "/pristup") {
    const url = request.nextUrl.clone();
    url.pathname = isClient ? "/portal" : "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
