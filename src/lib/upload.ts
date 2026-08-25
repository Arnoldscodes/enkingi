import { supabase } from "@/integrations/supabase/client";

export type UploadBucket = "avatars" | "seller-assets" | "product-images";

const LONG_LIVED_SECONDS = 60 * 60 * 24 * 365 * 10;

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
