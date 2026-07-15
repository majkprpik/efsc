"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Mail,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  ListPlus,
} from "lucide-react";
import { toast } from "sonner";
import { addRequest, deleteRequest, invitePortalUser, seedRequests } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/shared";
import { shortDate } from "@/lib/ui";

export type AdminRequest = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  uploaded: boolean;
  uploaded_at: string | null;
  original_name: string | null;
  ai_status: string | null;
  ai_note: string | null;
};

export type AdminClient = {
  id: string;
  naziv: string;
  email: string | null;
  status: string;
  users: { id: string; email: string; name: string }[];
  requests: AdminRequest[];
};

export function PortalAdminView({
  clients,
  initialId,
}: {
  clients: AdminClient[];
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId ?? clients[0]?.id ?? "");
  const selected = clients.find((c) => c.id === selectedId) ?? clients[0];

  if (clients.length === 0) {
    return <Empty>Nema klijenata.</Empty>;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 shrink-0 overflow-y-auto border-r">
        {clients.map((c) => {
          const done = c.requests.filter((r) => r.required && r.uploaded).length;
          const total = c.requests.filter((r) => r.required).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center justify-between gap-2 border-b px-4 py-3 text-left transition hover:bg-muted/50 ${
                c.id === selected?.id ? "bg-muted" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.naziv}</div>
                <div className="text-xs text-muted-foreground">
                  {c.users.length > 0 ? `${c.users.length} pristup` : "bez pristupa"}
                </div>
              </div>
              {total > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {done}/{total}
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {selected && <ClientPanel key={selected.id} client={selected} />}
    </div>
  );
}

function ClientPanel({ client }: { client: AdminClient }) {
  const [pending, start] = useTransition();

  function invite(formData: FormData) {
    formData.set("clientId", client.id);
    start(async () => {
      const res = await invitePortalUser(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Pozivnica poslana");
    });
  }

  function add(formData: FormData) {
    formData.set("clientId", client.id);
    start(async () => {
      const res = await addRequest(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Stavka dodana");
    });
  }

  function seed() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    start(async () => {
      const res = await seedRequests(fd);
      if (res?.error) toast.error(res.error);
      else if (res?.added === 0) toast.info("Sve standardne stavke već postoje");
      else toast.success(`Dodano ${res?.added} stavki`);
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{client.naziv}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Klijent vidi samo svoju listu na /portal.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="mb-3 text-sm font-medium">Pristup portalu</div>

          {client.users.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {client.users.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-500" />
                  <span className="text-muted-foreground">{u.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Nitko još nema pristup. Pošalji pozivnicu — dobiju link na mail, bez
              lozinke.
            </p>
          )}

          <form action={invite} className="flex gap-2">
            <Input
              name="email"
              type="email"
              placeholder={client.email || "ime@tvrtka.hr"}
              defaultValue={client.email ?? ""}
              required
              className="max-w-xs"
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Mail className="size-3.5" />
              )}
              Pošalji pozivnicu
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Tražena dokumentacija</div>
            <Button size="sm" variant="ghost" onClick={seed} disabled={pending}>
              <ListPlus className="size-3.5" />
              Standardni set
            </Button>
          </div>

          {client.requests.length === 0 ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Lista je prazna — dodaj stavke ili ubaci standardni set.
            </p>
          ) : (
            <div className="mb-4 flex flex-col gap-2">
              {client.requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2.5 rounded-md border px-3 py-2.5"
                >
                  {r.uploaded ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.name}</span>
                      {!r.required && <Badge variant="secondary">dodatno</Badge>}
                    </div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    )}
                    {r.uploaded && r.original_name && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {r.original_name}
                        {r.uploaded_at && ` · ${shortDate(r.uploaded_at)}`}
                      </div>
                    )}
                    {r.ai_status === "issue" && r.ai_note && (
                      <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-px size-3 shrink-0" />
                        <span>{r.ai_note}</span>
                      </div>
                    )}
                  </div>
                  <form
                    action={(fd) => {
                      fd.set("id", r.id);
                      start(async () => {
                        const res = await deleteRequest(fd);
                        if (res?.error) toast.error(res.error);
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="text-muted-foreground transition hover:text-destructive"
                      title="Ukloni"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={add} className="flex gap-2">
            <Input name="name" placeholder="Naziv dokumenta" required className="max-w-xs" />
            <Input name="description" placeholder="Napomena (opcionalno)" className="max-w-xs" />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              <Plus className="size-3.5" />
              Dodaj
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
