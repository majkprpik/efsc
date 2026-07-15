import { sendMagicLink } from "./actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-3xl font-semibold tracking-tight">Orbit</div>
          <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">
            klijentski portal · esfc.hr
          </div>
        </CardHeader>
        <CardContent>
          {sp.error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {sp.error}
            </div>
          )}
          {sp.message && (
            <div className="mb-4 rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              {sp.message}
            </div>
          )}

          <form action={sendMagicLink} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ime@tvrtka.hr"
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Upiši e-mail na koji si dobio poziv — poslat ćemo ti link za
              prijavu. Nema lozinke.
            </p>

            <Button type="submit" className="w-full">
              Pošalji link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
