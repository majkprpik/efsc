"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "orbit-docs";

/** Upload a file for a project's document checklist. */
export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const projectId = String(formData.get("projectId") ?? "");
  const docId = String(formData.get("docId") ?? ""); // optional: existing checklist row
  const file = formData.get("file") as File | null;
  if (!projectId || !file || file.size === 0) {
    return { error: "Nedostaje datoteka." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("folder_path")
    .eq("id", projectId)
    .single();
  const folder = (project?.folder_path || `projekti/${projectId}/`).replace(/\/+$/, "/");
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${folder}${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) return { error: `Upload nije uspio: ${upErr.message}` };

  const today = new Date().toISOString().slice(0, 10);

  // Storage upserts by path, so re-uploading the same filename must reuse the
  // existing row — otherwise two rows would point at one file and deleting
  // either would break the other.
  const targetId =
    docId ||
    (
      await supabase
        .from("project_docs")
        .select("id")
        .eq("project_id", projectId)
        .eq("storage_path", path)
        .maybeSingle()
    ).data?.id;

  if (targetId) {
    const { error } = await supabase
      .from("project_docs")
      .update({ uploaded: true, storage_path: path, uploaded_at: today, note: null })
      .eq("id", targetId);
    if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };
    // invalidate cached extracted text
    await supabase.from("document_text").delete().eq("doc_kind", "project").eq("doc_id", targetId);
  } else {
    const { error } = await supabase.from("project_docs").insert({
      project_id: projectId,
      name: file.name,
      uploaded: true,
      storage_path: path,
      uploaded_at: today,
      sort: 999,
    });
    if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };
  }

  revalidatePath("/projekti");
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const supabase = await createClient();
  const docId = String(formData.get("docId") ?? "");
  if (!docId) return { error: "Nedostaje dokument." };

  const { data: doc } = await supabase
    .from("project_docs")
    .select("storage_path")
    .eq("id", docId)
    .single();
  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  await supabase.from("project_docs").delete().eq("id", docId);
  await supabase.from("document_text").delete().eq("doc_kind", "project").eq("doc_id", docId);

  revalidatePath("/projekti");
  return { ok: true };
}
