"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "./dictionaries";

/** Persist the chosen language. A year, so it survives sessions. */
export async function setLocale(next: string) {
  if (!isLocale(next)) return;
  (await cookies()).set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Server components render the copy, so the whole tree has to re-render.
  revalidatePath("/", "layout");
}
