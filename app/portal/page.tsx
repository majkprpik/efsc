import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getPortalContext } from "./actions";
import { PortalChecklist } from "@/components/PortalChecklist";
import { PortalChatPanel, PortalChatMobileNote } from "@/components/PortalChat";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getT } from "@/lib/i18n/server";

export default async function PortalPage() {
  const ctx = await getPortalContext();

  // Ulogiran, ali profil nije vezan na klijenta — nema što prikazati.
  if (!ctx) redirect("/portal/login?error=Račun nije povezan s klijentom.");

  const t = await getT();
  const { client, profile, items } = ctx;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
                {t.portal.podnaslov}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.naziv}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.portal.prijavljenKao.replace("{email}", profile.email)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <LocaleToggle />
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  title={t.portal.odjava}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </header>

          <PortalChecklist items={items} submittedAt={client.submitted_at} />
        </div>
        <PortalChatMobileNote />
      </div>

      <PortalChatPanel />
    </div>
  );
}
