import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60;

interface SignedUrlOptions {
  expiresIn?: number;
  download?: boolean | string;
}

export async function createSignedStorageUrl(
  bucket: string,
  path: string,
  options: SignedUrlOptions = {},
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, options.expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS, {
      download: options.download,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create signed file URL.");
  }

  return data.signedUrl;
}

export async function openSignedStorageUrl(
  bucket: string,
  path: string,
  options: SignedUrlOptions = {},
): Promise<void> {
  const signedUrl = await createSignedStorageUrl(bucket, path, options);
  window.open(signedUrl, "_blank", "noopener,noreferrer");
}
