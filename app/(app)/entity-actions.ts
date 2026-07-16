"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Folder segment from a name, matching the seeded convention:
 * "Studio Forma" → "StudioForma", "ESF+ Digitalizacija 2025" → "ESF_Digitalizacija_2025".
 */
function slug(name: string, joiner: "" | "_" = "") {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents: č → c
    .replace(/đ/gi, "d")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1));
  return words.join(joiner) || "Bez_naziva";
}

/**
 * Two clients may share a name, but their folders must not — documents would
 * mix, and storage upserts by path would overwrite each other. Suffix until free.
 */
async function freeFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "clients" | "natjecaji" | "projects",
  base: string,
) {
  const { data } = await supabase
    .from(table)
    .select("folder_path")
    .like("folder_path", `${base.slice(0, -1)}%`);
  const taken = new Set((data ?? []).map((r) => r.folder_path));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, -1)}_${i}/`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, -1)}_${Date.now()}/`;
}

const CLIENT_STATUSES = ["active", "inactive", "potencijalni"] as const;
type ClientStatus = (typeof CLIENT_STATUSES)[number];

const NATJECAJ_STATUSES = ["aktivan", "zatvoren", "arhiva"] as const;
type NatjecajStatus = (typeof NATJECAJ_STATUSES)[number];

const PROJECT_STATUSES = ["Aktivan", "U pripremi", "Kasni", "Završen"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Clients and leads are the same table — `status` is what separates them. */
export async function createClientRow(formData: FormData) {
  const supabase = await createClient();

  const naziv = String(formData.get("naziv") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "active");
  if (!naziv) return { error: "Klijent treba naziv." };

  const status: ClientStatus = (CLIENT_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ClientStatus)
    : "active";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("id, name").eq("id", user.id).single()
    : { data: null };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      naziv,
      status,
      contact: String(formData.get("contact") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      saz: String(formData.get("saz") ?? "").trim() || null,
      folder_path: await freeFolder(supabase, "clients", `klijenti/${slug(naziv)}/`),
      zadnji_kontakt: status === "potencijalni" ? new Date().toISOString().slice(0, 10) : null,
      unio_id: profile?.id ?? null,
      unio_name: profile?.name ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/klijenti");
  revalidatePath("/potencijalni");
  return { ok: true, id: data.id };
}

export async function createNatjecaj(formData: FormData) {
  const supabase = await createClient();

  const naziv = String(formData.get("naziv") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "aktivan");
  if (!naziv) return { error: "Natječaj treba naziv." };

  const status: NatjecajStatus = (NATJECAJ_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as NatjecajStatus)
    : "aktivan";

  // folder_path is the parent holding per-client project folders;
  // nat_folder_path is the tender's own documentation subfolder.
  const folder = await freeFolder(supabase, "natjecaji", `natjecaji/${slug(naziv, "_")}/`);

  const { data, error } = await supabase
    .from("natjecaji")
    .insert({
      naziv,
      status,
      tijelo: String(formData.get("tijelo") ?? "").trim() || null,
      iznos: String(formData.get("iznos") ?? "").trim() || null,
      sufinanciranje: String(formData.get("sufinanciranje") ?? "").trim() || null,
      rok: String(formData.get("rok") ?? "") || null,
      folder_path: folder,
      nat_folder_path: `${folder}_dokumentacija_natjecaja/`,
    })
    .select("id")
    .single();
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/natjecaji");
  return { ok: true, id: data.id };
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const naziv = String(formData.get("naziv") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  const natjecajId = String(formData.get("natjecajId") ?? "");
  const statusRaw = String(formData.get("status") ?? "U pripremi");
  if (!naziv) return { error: "Projekt treba naziv." };

  const status: ProjectStatus = (PROJECT_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ProjectStatus)
    : "U pripremi";

  // A project under a tender lives beside the other applicants:
  // natjecaji/<Tender>/<Client>/. Otherwise it sits under the client's own folder.
  const [{ data: client }, { data: natjecaj }] = await Promise.all([
    clientId
      ? supabase.from("clients").select("naziv, folder_path").eq("id", clientId).maybeSingle()
      : Promise.resolve({ data: null }),
    natjecajId
      ? supabase.from("natjecaji").select("folder_path").eq("id", natjecajId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const base = natjecaj?.folder_path
    ? `${natjecaj.folder_path}${slug(client?.naziv ?? naziv)}/`
    : `${client?.folder_path || "klijenti/"}${slug(naziv)}/`;
  const folder = await freeFolder(supabase, "projects", base);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      naziv,
      status,
      client_id: clientId || null,
      natjecaj_id: natjecajId || null,
      rok: String(formData.get("rok") ?? "") || null,
      value: String(formData.get("value") ?? "").trim() || null,
      folder_path: folder,
    })
    .select("id")
    .single();
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

  revalidatePath("/projekti");
  revalidatePath("/natjecaji");
  revalidatePath("/klijenti");
  return { ok: true, id: data.id };
}
