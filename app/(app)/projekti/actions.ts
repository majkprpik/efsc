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

/**
 * Load (or lazily create) the working "prijava" document for a project.
 * One document per project — the row is created on first open so the editor
 * always has something to bind to.
 */
export async function loadCanvas(projectId: string) {
  const supabase = await createClient();
  if (!projectId) return { error: "Nedostaje projekt." };

  const { data: existing } = await supabase
    .from("canvas_docs")
    .select("id, content, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (existing) {
    return { ok: true, id: existing.id, content: existing.content, updatedAt: existing.updated_at };
  }

  const { data: created, error } = await supabase
    .from("canvas_docs")
    .insert({ project_id: projectId })
    .select("id, content, updated_at")
    .single();
  if (error || !created) {
    return { error: `Ne mogu otvoriti dokument: ${error?.message ?? "nepoznato"}` };
  }
  return { ok: true, id: created.id, content: created.content, updatedAt: created.updated_at };
}

/**
 * Save the document, snapshotting the previous content into canvas_versions
 * first. `source` marks whether this save came from a manual edit or from
 * accepting an AI change — history keeps both so "vrati" can go back either way.
 */
export async function saveCanvas(projectId: string, content: string, source: "user" | "ai" = "user") {
  const supabase = await createClient();
  if (!projectId) return { error: "Nedostaje projekt." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: doc } = await supabase
    .from("canvas_docs")
    .select("id, content")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!doc) return { error: "Dokument ne postoji." };

  // Snapshot the current content before overwriting — skip if unchanged.
  if (doc.content !== content) {
    await supabase.from("canvas_versions").insert({
      doc_id: doc.id,
      content: doc.content,
      source,
      created_by: user?.id ?? null,
    });
  }

  const { error } = await supabase
    .from("canvas_docs")
    .update({ content, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq("id", doc.id);
  if (error) return { error: `Spremanje nije uspjelo: ${error.message}` };

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
