import { supabase } from "@/integrations/supabase/client";

export type UploadBucket = "avatars" | "seller-assets" | "product-images";

const LONG_LIVED_SECONDS = 60 * 60 * 24 * 365 * 10;
const STORAGE_REFERENCE_PREFIX = "storage://";

export function toStorageReference(bucket: UploadBucket, urlOrReference: string): string {
  if (urlOrReference.startsWith(STORAGE_REFERENCE_PREFIX)) return urlOrReference;

  const marker = `/storage/v1/object/sign/${bucket}/`;
  const markerIndex = urlOrReference.indexOf(marker);
  if (markerIndex === -1) return urlOrReference;

  const path = urlOrReference.slice(markerIndex + marker.length).split("?")[0];
  return path ? `${STORAGE_REFERENCE_PREFIX}${bucket}/${decodeURIComponent(path)}` : urlOrReference;
}

function parseStorageReference(reference: string): { bucket: UploadBucket; path: string } | null {
  if (!reference.startsWith(STORAGE_REFERENCE_PREFIX)) return null;
  const value = reference.slice(STORAGE_REFERENCE_PREFIX.length);
  const slashIndex = value.indexOf("/");
  if (slashIndex === -1) return null;

  const bucket = value.slice(0, slashIndex) as UploadBucket;
  const path = value.slice(slashIndex + 1);
  if (!(["avatars", "seller-assets", "product-images"] as string[]).includes(bucket) || !path) return null;
  return { bucket, path };
}

export async function resolveImageUrl(reference: string | null): Promise<string | null> {
  if (!reference) return null;
  const stored = parseStorageReference(reference);
  if (!stored) return reference;

  const { data, error } = await supabase.storage
    .from(stored.bucket)
    .createSignedUrl(stored.path, LONG_LIVED_SECONDS);
  if (error || !data) throw error ?? new Error("Could not load image");
  return data.signedUrl;
}

export async function deleteStoredImage(reference: string | null): Promise<void> {
  if (!reference) return;
  const stored = parseStorageReference(reference);
  if (!stored) return;

  const { error } = await supabase.storage.from(stored.bucket).remove([stored.path]);
  if (error) throw error;
}

/** Uploads any file (e.g. a CV in PDF) and returns a permanent storage:// reference. */
export async function uploadDocument(
  bucket: UploadBucket,
  userId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return `${STORAGE_REFERENCE_PREFIX}${bucket}/${path}`;
}

export async function uploadImage(bucket: UploadBucket, userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, LONG_LIVED_SECONDS);
  if (signError || !data) throw signError ?? new Error("Could not create image link");
  return data.signedUrl;
}
