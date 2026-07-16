"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitPortal, unsubmitPortal } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n/client";

/**
 * "Gotov sam s dostavom" — jedini način da klijent kaže timu da je završio.
 *
 * Predaja ne gasi upload: ako klijent nakon nje pošalje još jedan dokument,
 * server vraća submitted_at na NULL i ovo se opet prikaže kao gumb.
 */
export function PortalSubmit({
  submittedAt,
  allDone,
}: {
  submittedAt: string | null;
  allDone: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();

  if (submittedAt) {
    const date = new Date(submittedAt).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="mb-6 rounded-xl border border-green-600/30 bg-green-500/5 p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t.portal.predano}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t.portal.predanoDatum.replace("{date}", date)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{t.portal.predanoMozesJos}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await unsubmitPortal();
                if (res?.error) toast.error(res.error);
                else toast.success(t.portal.predajaPonistena);
              })
            }
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t.portal.ponistiPredaju}
          </Button>
        </div>
      </div>
    );
  }

  // Dok nešto obavezno fali, gumb bi samo vratio grešku sa servera — ne nudimo ga.
  if (!allDone) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{t.portal.sveJeTu}</p>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await submitPortal();
            if (res?.error) toast.error(res.error);
            else toast.success(t.portal.predano);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? t.portal.predajem : t.portal.predajDokumentaciju}
      </Button>
    </div>
  );
}
