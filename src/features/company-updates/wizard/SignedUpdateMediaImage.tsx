import React, { useEffect, useState } from "react";
import { createSignedStorageUrl } from "@/lib/signedStorageUrls";
import type { UpdateMediaItem } from "./types";

const BUCKET = "company-updates-media";

export function SignedUpdateMediaImage({
  media,
  className,
}: {
  media: UpdateMediaItem;
  className?: string;
}) {
  const src = useSignedUpdateMediaUrl(media);

  if (!src) {
    return <div className={className} />;
  }

  return <img src={src} alt={media.name} className={className} />;
}

export function useSignedUpdateMediaUrl(media: UpdateMediaItem | null) {
  const [src, setSrc] = useState<string | null>(media?.url ?? null);

  useEffect(() => {
    let cancelled = false;

    if (!media) {
      setSrc(null);
      return;
    }

    if (media.url) {
      setSrc(media.url);
      return;
    }

    if (!media.storagePath) {
      setSrc(null);
      return;
    }

    createSignedStorageUrl(BUCKET, media.storagePath, { expiresIn: 300 })
      .then((signedUrl) => {
        if (!cancelled) setSrc(signedUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [media]);

  return src;
}
