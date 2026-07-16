"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_LOCALE,
  getDictionary,
  type Dictionary,
  type Locale,
} from "./dictionaries";

const LocaleContext = createContext<{ locale: Locale; t: Dictionary }>({
  locale: DEFAULT_LOCALE,
  t: getDictionary(DEFAULT_LOCALE),
});

/** Fed by the server layout, which reads the locale cookie. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Dictionary for client components. */
export function useT() {
  return useContext(LocaleContext).t;
}

/** Active locale — pass to the AI so it answers in the same language. */
export function useLocale() {
  return useContext(LocaleContext).locale;
}
