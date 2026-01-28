/**
 * Hook for calculating reports analytics metrics
 */

import { useMemo } from "react";
import { subDays, format } from "date-fns";
import {
  asArray,
  safeArrayFilter,
  safeArrayReduce,
  safeArrayLength,
} from "@/utils/reactQueryTypes";
import type { DocumentWithRelations } from "@/types/ingestion";
import type {
  TimeRange,
  CompareMetric,
  ComparisonRecord,
  StatusBreakdownItem,
} from "../types/reports";
import { CHART_COLORS } from "../types/reports";
import { getDaysFromTimeRange } from "@/shared/utils";

interface UseReportsMetricsProps {
  documents: DocumentWithRelations[];
  forms: Array<{
    latest_submission_at?: string | null;
    submissions_count?: number | null;
  }>;
  timeRange: TimeRange;
  compareMetric: CompareMetric;
}

export function useReportsMetrics({
  documents,
  forms,
  timeRange,
  compareMetric,
}: UseReportsMetricsProps) {
  const days = getDaysFromTimeRange(timeRange);
  const startDate = useMemo(() => subDays(new Date(), days - 1), [days]);

  const filteredDocuments = useMemo(
    () =>
      safeArrayFilter(documents, (document: any) => {
        const reference = document.doc_date ?? document.created_at;
        if (!reference) return false;
        return new Date(reference) >= startDate;
      }),
    [documents, startDate],
  );

  const filteredForms = useMemo(
    () =>
      safeArrayFilter(asArray(forms), (form) => {
        if (!form.latest_submission_at) return false;
        return new Date(form.latest_submission_at) >= startDate;
      }),
    [forms, startDate],
  );

  const totalFormSubmissions = useMemo(
    () =>
      safeArrayReduce(
        asArray(forms),
        (sum, form) => sum + (form.submissions_count ?? 0),
        0,
      ),
    [forms],
  );

  const formsWithActivity = useMemo(
    () =>
      safeArrayFilter(
        asArray(forms),
        (form) => (form.submissions_count ?? 0) > 0,
      ),
    [forms],
  );

  const readyReports = useMemo(
    () =>
      safeArrayFilter(
        filteredDocuments,
        (document: any) => document.processing_state === "ready",
      ),
    [filteredDocuments],
  );

  const followUpActions = useMemo(
    () =>
      safeArrayReduce(
        filteredDocuments,
        (sum: number, document: any) =>
          sum + (document.originating_tasks?.length ?? 0),
        0,
      ),
    [filteredDocuments],
  );

  const accuracyScore = filteredDocuments.length
    ? Math.round((readyReports.length / filteredDocuments.length) * 100)
    : 0;

  const completionRate = (() => {
    const totalItems = filteredDocuments.length + filteredForms.length;
    if (!totalItems) return 0;
    const completed =
      readyReports.length +
      filteredForms.filter((form) => form.submissions_count > 0).length;
    return Math.round((completed / totalItems) * 100);
  })();

  const formsArray = asArray(forms);
  const formsLength = safeArrayLength(forms);
  const formsCompletionRate =
    formsLength > 0
      ? Math.round((formsWithActivity.length / formsLength) * 100)
      : 0;

  const formsEngagementScore =
    formsLength > 0
      ? Math.min(
          100,
          Math.round((totalFormSubmissions / (formsLength * 12 || 1)) * 100),
        )
      : 0;

  const reportsEngagementScore = filteredDocuments.length
    ? Math.min(
        100,
        Math.round(
          ((filteredDocuments.length + followUpActions) / Math.max(1, days)) *
            100,
        ),
      )
    : 0;

  const timelineData = useMemo(() => {
    const map = new Map<
      string,
      { date: string; reports: number; forms: number }
    >();
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const key = format(date, "yyyy-MM-dd");
      map.set(key, {
        date: format(date, "MMM d"),
        reports: 0,
        forms: 0,
      });
    }

    filteredDocuments.forEach((document: any) => {
      const reference = document.doc_date ?? document.created_at;
      if (!reference) return;
      const key = reference.slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        entry.reports += 1;
      }
    });

    filteredForms.forEach((form) => {
      if (!form.latest_submission_at) return;
      const key = form.latest_submission_at.slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        const weight = Math.max(
          1,
          Math.round(
            (form.submissions_count ?? 1) / Math.max(1, Math.floor(days / 6)),
          ),
        );
        entry.forms += weight;
      }
    });

    return Array.from(map.values());
  }, [days, filteredDocuments, filteredForms]);

  const comparisonData: ComparisonRecord[] = useMemo(() => {
    switch (compareMetric) {
      case "completion":
        return [
          {
            label: "Completion rate",
            forms: formsCompletionRate,
            reports: completionRate,
          },
          {
            label: "Accuracy",
            forms: Math.min(100, Math.max(formsCompletionRate - 5, 0)),
            reports: accuracyScore,
          },
        ];
      case "engagement":
        return [
          {
            label: "Engagement score",
            forms: formsEngagementScore,
            reports: reportsEngagementScore,
          },
          {
            label: "Follow-ups",
            forms: Math.max(0, formsWithActivity.length - filteredForms.length),
            reports: followUpActions,
          },
        ];
      default:
        return [
          {
            label: "Total volume",
            forms: totalFormSubmissions,
            reports: filteredDocuments.length,
          },
          {
            label: "Ready this period",
            forms: filteredForms.length,
            reports: readyReports.length,
          },
        ];
    }
  }, [
    compareMetric,
    formsCompletionRate,
    completionRate,
    accuracyScore,
    formsEngagementScore,
    reportsEngagementScore,
    formsWithActivity.length,
    filteredForms.length,
    followUpActions,
    totalFormSubmissions,
    filteredDocuments.length,
    readyReports.length,
  ]);

  const statusBreakdown = useMemo((): StatusBreakdownItem[] => {
    const counts = safeArrayReduce(
      filteredDocuments,
      (acc: Record<string, number>, document: any) => {
        acc[document.processing_state] =
          (acc[document.processing_state] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(counts).map(([status, value], index) => ({
      status,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [filteredDocuments]);

  return {
    filteredDocuments,
    filteredForms,
    totalFormSubmissions,
    formsWithActivity,
    readyReports,
    followUpActions,
    accuracyScore,
    completionRate,
    formsCompletionRate,
    formsEngagementScore,
    reportsEngagementScore,
    timelineData,
    comparisonData,
    statusBreakdown,
    days,
    startDate,
  };
}
