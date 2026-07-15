"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "orbit-docs";

/** Mint a short-lived signed URL for previewing/downloading a private doc. */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
