import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag, type AppLanguage } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  SCHEDULE_TEXT_TABLE,
  TIME_OFF_TEXT_TABLE,
  resolveShiftText,
  resolveTimeOffText,
  shiftTranslationFields,
  timeOffTranslationFields,
  type ScheduleTextTranslation,
  type StoredScheduleText,
  type TimeOffTextTranslation,
} from "../scheduleTextFields";

const inFlight = new Set<string>();
const attempted = new Set<string>();

interface TextSource {
  id?: string;
  title?: string | null;
  notes?: string | null;
  reason?: string | null;
  updated_at?: string | null;
}

function useStoredRows(table: string, ids: string[]) {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const query = useQuery({
    queryKey: ["content-translations", table, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
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
  const rows = useMemo<StoredScheduleText[]>(
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
  return { companyId, rows };
}

function useTextMap<T>(
  table: string,
  records: TextSource[],
  resolve: (
    record: TextSource & { id: string },
    rows: StoredScheduleText[],
    viewerLocale: AppLanguage,
  ) => Promise<{
    translation: T | null;
    needsRequest: boolean;
    sourceLocale: AppLanguage | null;
  }>,
  fields: (record: TextSource) => Array<{ fieldPath: string; text: string }>,
) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => records.map((record) => record.id).filter((id): id is string => Boolean(id)),
    [records],
  );
  const { companyId, rows } = useStoredRows(table, ids);
  const [resolved, setResolved] = useState<Map<string, T | null>>(new Map());

  useEffect(() => {
    if (!companyId || records.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, T | null>();
      for (const record of records) {
        if (!record.id) continue;
        const result = await resolve({ ...record, id: record.id }, rows, viewerLocale);
        next.set(record.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${table}:${record.id}:${viewerLocale}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: table,
          sourceId: record.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: fields(record),
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
  }, [companyId, fields, queryClient, records, resolve, rows, table, viewerLocale]);

  return resolved;
}

export function useShiftTextTranslations(shifts: TextSource[]) {
  return useTextMap<ScheduleTextTranslation>(
    SCHEDULE_TEXT_TABLE,
    shifts,
    resolveShiftText,
    shiftTranslationFields,
  );
}

export function useTimeOffTextTranslations(requests: TextSource[]) {
  return useTextMap<TimeOffTextTranslation>(
    TIME_OFF_TEXT_TABLE,
    requests,
    resolveTimeOffText,
    timeOffTranslationFields,
  );
}
