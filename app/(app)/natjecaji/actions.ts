"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "orbit-docs";

/** Upload a document belonging to the tender itself (not to a client's application). */
export async function uploadNatjecajDocument(formData: FormData) {
  const supabase = await createClient();

  const natjecajId = String(formData.get("natjecajId") ?? "");
  const docId = String(formData.get("docId") ?? ""); // optional: replace an existing row
  const file = formData.get("file") as File | null;
  if (!natjecajId || !file || file.size === 0) {
    return { error: "Nedostaje datoteka." };
  }

  // nat_folder_path is the tender's own `_dokumentacija_natjecaja/` subfolder;
  // folder_path is the parent that holds the per-client project folders.
  const { data: natjecaj } = await supabase
    .from("natjecaji")
    .select("nat_folder_path")
    .eq("id", natjecajId)
    .single();
  if (!natjecaj?.nat_folder_path) {
    return { error: "Natječaj nema definiranu mapu za dokumentaciju." };
  }
  const folder = natjecaj.nat_folder_path.replace(/\/+$/, "/");
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${folder}${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) return { error: `Upload nije uspio: ${upErr.message}` };

  // Storage upserts by path, so re-uploading the same filename must reuse the
  // existing row — otherwise two rows would point at one file and deleting
  // either would break the other.
  const targetId =
    docId ||
    (
      await supabase
        .from("natjecaj_docs")
        .select("id")
        .eq("natjecaj_id", natjecajId)
        .eq("storage_path", path)
        .maybeSingle()
    ).data?.id;

  if (targetId) {
    const { error } = await supabase
      .from("natjecaj_docs")
      .update({ filename: file.name, storage_path: path })
      .eq("id", targetId);
    if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };
    await supabase.from("document_text").delete().eq("doc_kind", "natjecaj").eq("doc_id", targetId);
  } else {
    const { error } = await supabase.from("natjecaj_docs").insert({
      natjecaj_id: natjecajId,
      filename: file.name,
      storage_path: path,
    });
    if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };
  }

  revalidatePath("/natjecaji");
  return { ok: true };
}

export async function deleteNatjecajDocument(formData: FormData) {
  const supabase = await createClient();
  const docId = String(formData.get("docId") ?? "");
  if (!docId) return { error: "Nedostaje dokument." };

  const { data: doc } = await supabase
    .from("natjecaj_docs")
    .select("storage_path")
    .eq("id", docId)
    .single();
  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  await supabase.from("natjecaj_docs").delete().eq("id", docId);
  await supabase.from("document_text").delete().eq("doc_kind", "natjecaj").eq("doc_id", docId);

  revalidatePath("/natjecaji");
  return { ok: true };
}
