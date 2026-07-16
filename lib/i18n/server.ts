import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  isLocale,
  type Locale,
} from "./dictionaries";

/** Active locale for this request, from the cookie the sidebar toggle sets. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Server-side dictionary. */
export async function getT() {
  return getDictionary(await getLocale());
}
