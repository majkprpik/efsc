import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Isti cookie kao Orbit: klijent koji prebaci na EN ostaje na EN kroz portal.
  const locale = await getLocale();

  return (
    <LocaleProvider locale={locale}>
      <div className="flex h-screen flex-col overflow-hidden bg-muted/30">{children}</div>
    </LocaleProvider>
  );
}
