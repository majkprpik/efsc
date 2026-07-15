import { redirect } from "next/navigation";
import { CheckCircle2, Circle, LogOut, FileText } from "lucide-react";
import { getPortalContext } from "./actions";
import { PortalUploadButton, PortalDropzone, AiBadge } from "@/components/PortalUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { shortDate } from "@/lib/ui";

export default async function PortalPage() {
  const ctx = await getPortalContext();

  // Ulogiran, ali profil nije vezan na klijenta — nema što prikazati.
  if (!ctx) redirect("/portal/login?error=Račun nije povezan s klijentom.");

  const { client, profile, items } = ctx;

  const required = items.filter((i) => i.required);
  const done = required.filter((i) => i.uploaded).length;
  const pct = required.length ? Math.round((done / required.length) * 100) : 100;
  const extra = items.filter((i) => !i.required);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
            Orbit · esfc.hr
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.naziv}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prijavljen kao {profile.email}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Odjava"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {required.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-sm font-medium">Dostavljeno</div>
              <div className="text-sm text-muted-foreground">
                {done} / {required.length}
              </div>
            </div>
            <Progress value={pct} />
            {done === required.length && (
              <p className="mt-3 text-sm text-muted-foreground">
                Sve je tu — javit ćemo se ako nešto zatreba.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Trenutno nema traženih dokumenata. Javit ćemo se kad nešto zatreba.
          </CardContent>
        </Card>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-medium">Potrebni dokumenti</h2>
          <div className="mb-8 flex flex-col gap-2">
            {required.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  {item.uploaded ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                    {item.uploaded && item.original_name && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="size-3" />
                        <span className="truncate">{item.original_name}</span>
                        {item.uploaded_at && <span>· {shortDate(item.uploaded_at)}</span>}
                      </div>
                    )}
                    <AiBadge status={item.ai_status} note={item.ai_note} />
                  </div>

                  <PortalUploadButton
                    requestId={item.id}
                    label={item.uploaded ? "Zamijeni" : "Uploadaj"}
                    variant={item.uploaded ? "outline" : "default"}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {extra.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium">Ostalo dostavljeno</h2>
          <div className="mb-8 flex flex-col gap-2">
            {extra.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 truncate text-sm">{item.name}</div>
                  <Badge variant="secondary">dodatno</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <PortalDropzone />
    </div>
  );
}
