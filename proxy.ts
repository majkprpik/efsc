import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     *
     * Walkthrough narration (/narration/*.wav + .json) is excluded too: <audio>
     * and fetch() for those fire before the tour can prove a session, and a
     * redirect to /login there just silently kills the voice-over.
     */
    "/((?!_next/static|_next/image|favicon.ico|narration/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
