import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  EMPLOYEE_BADGE_TABLE,
  RECOGNITION_EVENT_TABLE,
  badgeReasonFields,
  recognitionMessageFields,
  resolveBadgeReason,
  resolveRecognitionMessage,
  type StoredRecognitionTranslation,
} from "../recognitionContent";

const inFlight = new Set<string>();
const attempted = new Set<string>();

interface TextSource {
  id?: string;
  text?: string | null;
  updated_at?: string | null;
}

function useSingleFieldTranslations(
  table: string,
  fieldPath: "message" | "reason",
  records: TextSource[],
) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => records.map((record) => record.id).filter((id): id is string => Boolean(id)),
    [records],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<
    Map<string, { sourceLocale: typeof viewerLocale; text: string } | null>
  >(new Map());
  const query = useQuery({
    queryKey: ["content-translations", table, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select("source_id, field_path, locale, source_locale, source_hash, translated_text")
        .eq("source_table", table)
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
  const rows = useMemo<StoredRecognitionTranslation[]>(
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
    if (!companyId || records.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, { sourceLocale: typeof viewerLocale; text: string } | null>();
      for (const record of records) {
        if (!record.id) continue;
        const result =
          fieldPath === "message"
            ? await resolveRecognitionMessage(
                { id: record.id, message: record.text },
                rows,
                viewerLocale,
              )
            : await resolveBadgeReason(
                { id: record.id, reason: record.text },
                rows,
                viewerLocale,
              );
        next.set(
          record.id,
          result.text && result.sourceLocale
            ? { sourceLocale: result.sourceLocale, text: result.text }
            : null,
        );
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${table}:${record.id}:${viewerLocale}:${record.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        const fields =
          fieldPath === "message"
            ? recognitionMessageFields({ message: record.text })
            : badgeReasonFields({ reason: record.text });
        void requestContentTranslation({
          companyId,
          sourceTable: table,
          sourceId: record.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields,
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", table, companyId],
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
  }, [companyId, fieldPath, idKey, queryClient, records, rows, table, viewerLocale]);

  return resolved;
}

export function useRecognitionMessageTranslations(records: TextSource[]) {
  return useSingleFieldTranslations(RECOGNITION_EVENT_TABLE, "message", records);
}

export function useBadgeReasonTranslations(records: TextSource[]) {
  return useSingleFieldTranslations(EMPLOYEE_BADGE_TABLE, "reason", records);
}
