import { login, signup } from "./actions";
import { getT } from "@/lib/i18n/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const t = await getT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-3xl font-semibold tracking-tight">Orbit</div>
          <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">
            {t.login.podnaslov}
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

          <form className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t.login.ime}</Label>
              <Input id="name" name="name" placeholder={t.login.imePlaceholder} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t.login.email}</Label>
              {/* DEMO: predpopunjeno za test — ukloniti defaultValue za produkciju */}
              <Input id="email" name="email" type="email" placeholder="ana@esfc.hr" defaultValue="ana@esfc.hr" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t.login.lozinka}</Label>
              {/* DEMO: predpopunjeno za test — ukloniti defaultValue za produkciju */}
              <Input id="password" name="password" type="password" placeholder="••••••••" defaultValue="orbit1234" required />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t.login.demoNapomena}
            </p>

            <Button type="submit" formAction={login} className="mt-1 w-full">
              {t.login.prijava}
            </Button>
            <Button type="submit" formAction={signup} variant="outline" className="w-full">
              {t.login.registracija}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
