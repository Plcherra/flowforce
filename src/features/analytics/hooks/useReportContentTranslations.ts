import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  CUSTOM_REPORT_TABLE,
  EMPLOYEE_REPORT_TABLE,
  customReportTranslationFields,
  employeeReportTranslationFields,
  resolveCustomReportTranslation,
  resolveEmployeeNoteTranslation,
  type EmployeeNoteTranslation,
  type ReportContentTranslation,
  type StoredReportTranslation,
} from "../reportContentFields";

const inFlight = new Set<string>();
const attempted = new Set<string>();

interface ReportSource {
  id?: string;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  updated_at?: string | null;
}

function useStoredReportRows(table: string, ids: string[]) {
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
  const rows = useMemo<StoredReportTranslation[]>(
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
  return { companyId, rows, query };
}

export function useCustomReportTranslations(reports: ReportSource[]) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => reports.map((report) => report.id).filter((id): id is string => Boolean(id)),
    [reports],
  );
  const { companyId, rows, query } = useStoredReportRows(CUSTOM_REPORT_TABLE, ids);
  const [resolved, setResolved] = useState<Map<string, ReportContentTranslation | null>>(
    new Map(),
  );
  const retries = useRef(0);

  useEffect(() => {
    if (!companyId || reports.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, ReportContentTranslation | null>();
      for (const report of reports) {
        if (!report.id) continue;
        const source = {
          id: report.id,
          name: report.name ?? "",
          description: report.description,
        };
        const result = await resolveCustomReportTranslation(source, rows, viewerLocale);
        next.set(report.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${report.id}:${viewerLocale}:${report.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: CUSTOM_REPORT_TABLE,
          sourceId: report.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: customReportTranslationFields(source),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", CUSTOM_REPORT_TABLE, companyId],
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
  }, [companyId, queryClient, reports, rows, viewerLocale]);

  useEffect(() => {
    if (!query.isSuccess || ids.length === 0) return;
    const covered = new Set(rows.map((row) => row.sourceId));
    if (ids.every((id) => covered.has(id))) {
      retries.current = 0;
      return;
    }
    if (retries.current >= 2) return;
    retries.current += 1;
    const timer = setTimeout(() => void query.refetch(), 4000);
    return () => clearTimeout(timer);
  }, [ids, query, rows]);

  return resolved;
}

export function useEmployeeReportTranslations(reports: ReportSource[]) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => reports.map((report) => report.id).filter((id): id is string => Boolean(id)),
    [reports],
  );
  const { companyId, rows, query } = useStoredReportRows(EMPLOYEE_REPORT_TABLE, ids);
  const [resolved, setResolved] = useState<Map<string, EmployeeNoteTranslation | null>>(
    new Map(),
  );
  const retries = useRef(0);

  useEffect(() => {
    if (!companyId || reports.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, EmployeeNoteTranslation | null>();
      for (const report of reports) {
        if (!report.id) continue;
        const result = await resolveEmployeeNoteTranslation(
          { id: report.id, notes: report.notes },
          rows,
          viewerLocale,
        );
        next.set(report.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${EMPLOYEE_REPORT_TABLE}:${report.id}:${viewerLocale}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: EMPLOYEE_REPORT_TABLE,
          sourceId: report.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: employeeReportTranslationFields({ notes: report.notes }),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", EMPLOYEE_REPORT_TABLE, companyId],
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
  }, [companyId, queryClient, reports, rows, viewerLocale]);

  useEffect(() => {
    if (!query.isSuccess || ids.length === 0) return;
    const covered = new Set(rows.map((row) => row.sourceId));
    if (ids.every((id) => covered.has(id))) {
      retries.current = 0;
      return;
    }
    if (retries.current >= 2) return;
    retries.current += 1;
    const timer = setTimeout(() => void query.refetch(), 4000);
    return () => clearTimeout(timer);
  }, [ids, query, rows]);

  return resolved;
}
