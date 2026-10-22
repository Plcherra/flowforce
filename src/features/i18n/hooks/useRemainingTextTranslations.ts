import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag, type AppLanguage } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  EXPENSE_TABLE,
  OPS_ISSUE_TABLE,
  VENDOR_VISIT_TABLE,
  expenseTextFields,
  opsIssueTextFields,
  resolveWrittenText,
  vendorVisitTextFields,
  type StoredWrittenTranslation,
  type WrittenField,
} from "../remainingWrittenText";

const inFlight = new Set<string>();
const attempted = new Set<string>();

interface ProseSource {
  id?: string;
  sourceLocale?: string | null;
  updated_at?: string | null;
  fields: WrittenField[];
}

export interface WrittenTranslation {
  sourceLocale: AppLanguage;
  values: Record<string, string>;
}

function useWrittenTranslations(table: string, records: ProseSource[]) {
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
  const [resolved, setResolved] = useState<Map<string, WrittenTranslation | null>>(new Map());
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
  const rows = useMemo<StoredWrittenTranslation[]>(
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
      const next = new Map<string, WrittenTranslation | null>();
      for (const record of records) {
        if (!record.id) continue;
        const result = await resolveWrittenText(
          { id: record.id, sourceLocale: record.sourceLocale, fields: record.fields },
          rows,
          viewerLocale,
        );
        const hasText = Object.keys(result.values).length > 0;
        next.set(
          record.id,
          hasText && result.sourceLocale
            ? { sourceLocale: result.sourceLocale, values: result.values }
            : null,
        );
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
          fields: record.fields,
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

export function useExpenseTranslations(
  expenses: Array<{
    id?: string;
    description?: string | null;
    notes?: string | null;
    updated_at?: string | null;
  }>,
) {
  const records = useMemo(
    () =>
      expenses.map((expense) => ({
        id: expense.id,
        updated_at: expense.updated_at,
        fields: expenseTextFields(expense),
      })),
    [expenses],
  );
  return useWrittenTranslations(EXPENSE_TABLE, records);
}

export function useOpsIssueTranslations(
  issues: Array<{
    id?: string;
    title?: string | null;
    description?: string | null;
    sourceLocale?: string | null;
    updated_at?: string | null;
  }>,
) {
  const records = useMemo(
    () =>
      issues.map((issue) => ({
        id: issue.id,
        sourceLocale: issue.sourceLocale,
        updated_at: issue.updated_at,
        fields: opsIssueTextFields(issue),
      })),
    [issues],
  );
  return useWrittenTranslations(OPS_ISSUE_TABLE, records);
}

export function useVendorDescriptionTranslations(
  visits: Array<{
    id?: string;
    description?: string | null;
    updated_at?: string | null;
  }>,
) {
  const records = useMemo(
    () =>
      visits.map((visit) => ({
        id: visit.id,
        updated_at: visit.updated_at,
        fields: vendorVisitTextFields(visit),
      })),
    [visits],
  );
  return useWrittenTranslations(VENDOR_VISIT_TABLE, records);
}
