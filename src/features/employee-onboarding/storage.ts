import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { openSignedStorageUrl } from "@/lib/signedStorageUrls";
import { SIGNED_URL_SECONDS } from "./constants";

export async function uploadPrivateOnboardingFile(bucket: string, path: string, file: File) {
  const { error } = await db.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
}

export async function removePrivateOnboardingFile(bucket: string, path: string) {
  await db.storage.from(bucket).remove([path]);
}

export async function openPrivateOnboardingFile(bucket: string, path: string) {
  await openSignedStorageUrl(bucket, path, { expiresIn: SIGNED_URL_SECONDS });
}
