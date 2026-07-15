import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Topbar, Pill, Empty } from "@/components/ui";
import { shortDate } from "@/lib/ui";

const FILTERS = [
  { key: "svi", label: "svi" },
  { key: "aktivan", label: "aktivni" },
  { key: "zatvoren", label: "zatvoreni" },
  { key: "arhiva", label: "arhiva" },
] as const;

export default async function NatjecajiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; f?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.f ?? "svi";
  const supabase = await createClient();

  let query = supabase
    .from("natjecaji")
    .select("id, naziv, status, rok, tijelo, iznos, sufinanciranje, tags, folder_path, nat_folder_path")
    .order("rok", { ascending: true, nullsFirst: false });
  if (filter !== "svi") query = query.eq("status", filter as "aktivan" | "zatvoren" | "arhiva");
  const { data: natjecaji } = await query;

  // client counts per natjecaj (via projects)
  const { data: projRows } = await supabase
    .from("projects")
    .select("id, natjecaj_id, naziv, progress, color, status, clients(naziv)");

  const selectedId = sp.id ?? natjecaji?.[0]?.id;
  const selected = natjecaji?.find((n) => n.id === selectedId);
  const selectedProjects = projRows?.filter((p) => p.natjecaj_id === selectedId) ?? [];

  let docs: { id: string; filename: string }[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("natjecaj_docs")
      .select("id, filename")
      .eq("natjecaj_id", selectedId)
      .order("filename");
    docs = data ?? [];
  }

  const clientCount = (natjecajId: string) =>
    new Set(
      projRows?.filter((p) => p.natjecaj_id === natjecajId).map((p) => (p.clients as { naziv: string } | null)?.naziv),
    ).size;

  return (
    <>
      <Topbar title="Natječaji" />
      <div className="grid h-[calc(100vh-56px)] grid-cols-[270px_minmax(0,1fr)] overflow-hidden">
        {/* LIST */}
        <div className="flex flex-col overflow-y-auto border-r border-b bg-bg2">
          <div className="flex flex-wrap gap-1 border-b border-b p-2.5">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/natjecaji?f=${f.key}`}
                className={`rounded-full border px-2.5 py-[3px] text-[11px] ${
                  filter === f.key
                    ? "border-[var(--gb2)] bg-[var(--gb)] text-gold"
                    : "border-b2 bg-bg3 text-t2"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          {natjecaji?.length ? (
            natjecaji.map((n) => (
              <Link
                key={n.id}
                href={`/natjecaji?id=${n.id}${filter !== "svi" ? `&f=${filter}` : ""}`}
                className={`flex items-center gap-2.5 border-b border-b px-3.5 py-3 hover:bg-bg3 ${
                  n.id === selectedId ? "border-l-2 border-l-gold bg-bg3" : ""
                }`}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[7px] bg-[var(--gb)] text-gold">
                  <i className="ti ti-trophy text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{n.naziv}</div>
                  <div className="text-[11px] text-t3">
                    {clientCount(n.id)} kl. · {shortDate(n.rok)}
                  </div>
                </div>
                <Pill status={n.status} />
              </Link>
            ))
          ) : (
            <Empty>Nema natječaja</Empty>
          )}
        </div>

        {/* DETAIL */}
        <div className="overflow-y-auto bg-bg p-6">
          {selected ? (
            <>
              <div className="mb-4 flex items-start gap-3.5 border-b border-b pb-4">
                <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[var(--gb)] text-gold">
                  <i className="ti ti-trophy text-lg" />
                </div>
                <div className="flex-1">
                  <div className="font-serif text-2xl leading-tight">{selected.naziv}</div>
                  <div className="mt-0.5 text-[12px] text-t3">
                    {[selected.tijelo, selected.iznos, selected.sufinanciranje && `${selected.sufinanciranje} sufinanciranje`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <Pill status={selected.status} />
              </div>

              <div className="mb-3.5 grid grid-cols-3 gap-2">
                <Info label="Rok prijave" value={shortDate(selected.rok)} accent={selected.status === "aktivan" ? "red" : undefined} />
                <Info label="Klijenata" value={String(clientCount(selected.id))} />
                <Info label="Projekata" value={String(selectedProjects.length)} />
              </div>

              <FolderBar path={selected.folder_path} label="otvori" icon="ti-folder" />
              <FolderBar path={selected.nat_folder_path} label="dokumentacija" icon="ti-file-description" blue />

              <div className="mb-2 mt-4 text-[10px] uppercase tracking-[1px] text-t3">
                Dokumenti natječaja
              </div>
              <div className="overflow-hidden rounded-[var(--r)] border border-b bg-bg2">
                {docs.length ? (
                  docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0">
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[7px] bg-bg4 text-t3">
                        <i className="ti ti-file text-sm" />
                      </div>
                      <div className="min-w-0 flex-1 truncate text-[13px]">{d.filename}</div>
                      <div className="text-[11px] text-t3">Dokumentacija natječaja</div>
                    </div>
                  ))
                ) : (
                  <Empty>Nema dokumenata</Empty>
                )}
              </div>

              {selectedProjects.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-[10px] uppercase tracking-[1px] text-t3">
                    Projekti pod natječajem
                  </div>
                  <div className="overflow-hidden rounded-[var(--r)] border border-b bg-bg2">
                    {selectedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projekti?id=${p.id}`}
                        className="flex items-center gap-2.5 border-b border-b px-[18px] py-2.5 last:border-b-0 hover:bg-bg3"
                      >
                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px]">{p.naziv}</div>
                          <div className="truncate text-[11px] text-t3">
                            {(p.clients as { naziv: string } | null)?.naziv ?? "—"}
                          </div>
                        </div>
                        <Pill status={p.status} />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-[13px] text-t3">
              <i className="ti ti-trophy text-3xl opacity-20" />
              Odaberi natječaj
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: "red" }) {
  return (
    <div className="rounded-[var(--rs)] bg-bg3 px-3.5 py-2.5">
      <div className="mb-0.5 text-[10px] uppercase tracking-[1px] text-t3">{label}</div>
      <div className={`text-[13px] font-medium ${accent === "red" ? "text-red" : ""}`}>{value}</div>
    </div>
  );
}

function FolderBar({
  path,
  label,
  icon,
  blue,
}: {
  path: string;
  label: string;
  icon: string;
  blue?: boolean;
}) {
  if (!path) return null;
  return (
    <div className="mb-2.5 flex items-center gap-2.5 rounded-[var(--rs)] border border-b bg-bg3 px-3.5 py-2.5 text-[12px] text-t2">
      <i className={`ti ${icon} text-[15px] ${blue ? "text-blue" : "text-gold"}`} />
      <span className="flex-1 truncate font-mono text-[11px]">{path}</span>
      <span className="text-[11px] text-blue">{label}</span>
    </div>
  );
}
