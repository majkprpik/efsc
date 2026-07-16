"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClientRow, createNatjecaj, createProject } from "@/app/(app)/entity-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Shared shell: trigger button + dialog + form wiring. */
function EntityDialog({
  label,
  title,
  action,
  success,
  children,
}: {
  label: string;
  title: string;
  action: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>;
  success: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(success);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{title}</DialogTitle>
          <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
            {children}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t.common.odustani}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {t.common.spremi}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} autoComplete="off" {...props} />
    </div>
  );
}

/** `status` decides whether this lands on Klijenti or Potencijalni. */
export function AddClientButton({ status = "active" }: { status?: "active" | "potencijalni" }) {
  const t = useT();
  const lead = status === "potencijalni";

  return (
    <EntityDialog
      label={lead ? t.potencijalni.dodaj : t.klijenti.dodaj}
      title={lead ? t.potencijalni.novi : t.klijenti.novi}
      action={createClientRow}
      success={lead ? t.potencijalni.dodan : t.klijenti.dodan}
    >
      <input type="hidden" name="status" value={status} />
      <Field id="c-naziv" name="naziv" label={t.klijenti.naziv} required autoFocus />
      <Field id="c-contact" name="contact" label={t.klijenti.kontakt} />
      <Field id="c-email" name="email" type="email" label={t.login.email} />
      <Field id="c-phone" name="phone" label={t.klijenti.telefon} />
      {lead && (
        <div className="space-y-1.5">
          <Label htmlFor="c-saz">{t.potencijalni.aiSazetak}</Label>
          <textarea
            id="c-saz"
            name="saz"
            rows={3}
            placeholder={t.potencijalni.sazPlaceholder}
            className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      )}
    </EntityDialog>
  );
}

export function AddNatjecajButton() {
  const t = useT();
  return (
    <EntityDialog
      label={t.natjecaji.dodaj}
      title={t.natjecaji.novi}
      action={createNatjecaj}
      success={t.natjecaji.dodan}
    >
      <Field id="n-naziv" name="naziv" label={t.klijenti.naziv} required autoFocus />
      <Field id="n-tijelo" name="tijelo" label={t.natjecaji.tijelo} />
      <Field id="n-rok" name="rok" type="date" label={t.natjecaji.rokPrijave} />
      <Field id="n-iznos" name="iznos" label={t.common.iznos} placeholder="npr. 50.000 EUR" />
      <Field id="n-sufin" name="sufinanciranje" label={t.natjecaji.sufinanciranjePolje} placeholder="npr. 85%" />
      <div className="space-y-1.5">
        <Label htmlFor="n-status">{t.common.status}</Label>
        <select id="n-status" name="status" defaultValue="aktivan" className={selectCls}>
          {(["aktivan", "zatvoren", "arhiva"] as const).map((s) => (
            <option key={s} value={s}>
              {t.statusi[s]}
            </option>
          ))}
        </select>
      </div>
    </EntityDialog>
  );
}

export function AddProjectButton({
  clients,
  natjecaji,
}: {
  clients: { id: string; naziv: string }[];
  natjecaji: { id: string; naziv: string }[];
}) {
  const t = useT();
  return (
    <EntityDialog
      label={t.projekti.dodaj}
      title={t.projekti.novi}
      action={createProject}
      success={t.projekti.dodan}
    >
      <Field id="p-naziv" name="naziv" label={t.klijenti.naziv} required autoFocus />
      <div className="space-y-1.5">
        <Label htmlFor="p-client">{t.common.klijent}</Label>
        <select id="p-client" name="clientId" defaultValue="" className={selectCls}>
          <option value="">{t.projekti.bezKlijenta}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naziv}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-natjecaj">{t.nav.natjecaji}</Label>
        <select id="p-natjecaj" name="natjecajId" defaultValue="" className={selectCls}>
          <option value="">{t.projekti.bezNatjecaja}</option>
          {natjecaji.map((n) => (
            <option key={n.id} value={n.id}>
              {n.naziv}
            </option>
          ))}
        </select>
      </div>
      <Field id="p-rok" name="rok" type="date" label={t.common.rok} />
      <Field id="p-value" name="value" label={t.common.iznos} placeholder="npr. 9.600 EUR" />
      <div className="space-y-1.5">
        <Label htmlFor="p-status">{t.common.status}</Label>
        <select id="p-status" name="status" defaultValue="U pripremi" className={selectCls}>
          {(["Aktivan", "U pripremi", "Kasni", "Završen"] as const).map((s) => (
            <option key={s} value={s}>
              {t.statusi[s]}
            </option>
          ))}
        </select>
      </div>
    </EntityDialog>
  );
}
