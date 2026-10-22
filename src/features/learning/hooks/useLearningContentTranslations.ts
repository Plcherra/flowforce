import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  COURSE_TABLE,
  LEARNING_MODULE_TABLE,
  learningTextFields,
  resolveLearningTranslation,
  type LearningTranslation,
  type StoredLearningTranslation,
} from "../learningContent";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface LearningTextSource {
  id?: string;
  title?: string | null;
  description?: string | null;
  updated_at?: string | null;
}

function useLearningTranslations(table: string, records: LearningTextSource[]) {
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
  const [resolved, setResolved] = useState<Map<string, LearningTranslation | null>>(new Map());
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
  const rows = useMemo<StoredLearningTranslation[]>(
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
      const next = new Map<string, LearningTranslation | null>();
      for (const record of records) {
        if (!record.id) continue;
        const source = {
          id: record.id,
          title: record.title ?? "",
          description: record.description,
        };
        const result = await resolveLearningTranslation(source, rows, viewerLocale);
        next.set(record.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${table}:${record.id}:${viewerLocale}:${record.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: table,
          sourceId: record.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: learningTextFields(source),
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
  }, [companyId, idKey, queryClient, records, rows, table, viewerLocale]);

  return resolved;
}

export function useCourseTranslations(records: LearningTextSource[]) {
  return useLearningTranslations(COURSE_TABLE, records);
}

export function useModuleTranslations(records: LearningTextSource[]) {
  return useLearningTranslations(LEARNING_MODULE_TABLE, records);
}
