import { createSupabaseAdminClient } from "../supabase/admin";
import { DOCUMENTS_BUCKET } from "../constants";

// Upload a file buffer to the private documents bucket. Returns the storage path.
export async function uploadDocumentFile(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

// Short-lived signed URL so an officer can download a stored document.
export async function signedDocumentUrl(
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Could not sign URL: ${error?.message}`);
  return data.signedUrl;
}

// Build a unique, tidy storage key.
export function buildStoragePath(fileName: string, folder = "uploads"): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${stamp}-${rand}-${safe}`;
}
