import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  buildCompanyStoragePath,
  resolveProfileCompanyId,
} from "@/lib/storagePaths";
import type { UpdateMediaItem } from "./types";

const BUCKET = "company-updates-media";

const resolveMediaType = (file: File): UpdateMediaItem["type"] => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
};

export function useUploadMedia() {
  const { profile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (input?: FileList | File[]) => {
    if (!input || (Array.isArray(input) && input.length === 0)) {
      return [];
    }

    const files = Array.isArray(input) ? input : Array.from(input);
    if (files.length === 0) return [];

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const companyId = resolveProfileCompanyId(profile);
      if (!companyId) {
        throw new Error("Your account is not attached to a company yet.");
      }

      const uploaded: UpdateMediaItem[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const fileId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);
        const path = buildCompanyStoragePath(
          companyId,
          `drafts/${new Date().toISOString().slice(0, 10)}`,
          file.name,
        );

        const { error: uploadError, data } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploaded.push({
          id: fileId,
          type: resolveMediaType(file),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          storagePath: data.path,
        });

        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      return uploaded;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload media.";
      setError(message);
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [profile]);

  const resetError = useCallback(() => setError(null), []);

  return {
    isUploading,
    progress,
    error,
    uploadFiles,
    resetError,
  };
}
