import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  ANNOUNCEMENT_TABLE,
  announcementTranslationFields,
  resolveAnnouncementTranslation,
  type AnnouncementTranslation,
  type StoredAnnouncementTranslation,
} from "../announcementContent";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface AnnouncementSource {
  id?: string;
  title?: string | null;
  content?: string | null;
  updated_at?: string | null;
}

export function useAnnouncementTranslations(announcements: AnnouncementSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () =>
      announcements.map((item) => item.id).filter((id): id is string => Boolean(id)),
    [announcements],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, AnnouncementTranslation | null>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["content-translations", ANNOUNCEMENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", ANNOUNCEMENT_TABLE)
        .in("source_id", ids);
      if (error) throw error;
      return (data ?? []) as Array<{
        source_id: string;
        field_path: string;
        locale: string;
        source_locale: string;
        source_hash: string;
        translated_text: string;
      }>;
    },
  });

  const rows = useMemo<StoredAnnouncementTranslation[]>(
    () =>
      (query.data ?? []).map((row) => ({
        sourceId: row.source_id,
        fieldPath: row.field_path,
        locale: row.locale,
        sourceLocale: row.source_locale,
        sourceHash: row.source_hash,
        translatedText: row.translated_text,
      })),
    [query.data],
  );

  useEffect(() => {
    if (!companyId || announcements.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, AnnouncementTranslation | null>();
      for (const announcement of announcements) {
        if (!announcement.id) continue;
        const source = {
          id: announcement.id,
          title: announcement.title ?? "",
          content: announcement.content,
        };
        const result = await resolveAnnouncementTranslation(source, rows, viewerLocale);
        next.set(announcement.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${announcement.id}:${viewerLocale}:${announcement.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: ANNOUNCEMENT_TABLE,
          sourceId: announcement.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: announcementTranslationFields(source),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", ANNOUNCEMENT_TABLE, companyId],
              });
            }
          })
          .catch(() => undefined)
          .finally(() => inFlight.delete(key));
      }
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [announcements, companyId, idKey, queryClient, rows, viewerLocale]);

  return resolved;
}
