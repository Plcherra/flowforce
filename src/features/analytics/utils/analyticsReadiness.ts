import type { TFunction } from "i18next";
import type { BusinessAnalyticsSnapshotResult } from "@/services/analytics/businessAnalyticsService";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import type { DocumentWithRelations } from "@/types/ingestion";

export type AnalyticsViewMode = "owner" | "manager";

export interface AnalyticsReadinessMetric {
  id: string;
  labelKey: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  value: string;
  valueKey?: string;
  status: "ready" | "watch" | "blocked";
}

export interface AnalyticsReadinessReviewItem {
  id: string;
  labelKey: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  severity: "critical" | "warning" | "info";
}

export interface AnalyticsReadinessSummary {
  viewMode: AnalyticsViewMode;
  liveDataReady: boolean;
  exportReady: boolean;
  aiReady: boolean;
  costEngineReady: boolean;
  metrics: AnalyticsReadinessMetric[];
  reviewItems: AnalyticsReadinessReviewItem[];
}

export interface AnalyticsReadinessMetricDisplay {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: AnalyticsReadinessMetric["status"];
}

export interface AnalyticsReadinessReviewItemDisplay {
  id: string;
  label: string;
  detail: string;
  severity: AnalyticsReadinessReviewItem["severity"];
}

export interface AnalyticsReadinessSummaryDisplay {
  viewMode: AnalyticsViewMode;
  liveDataReady: boolean;
  exportReady: boolean;
  aiReady: boolean;
  costEngineReady: boolean;
  metrics: AnalyticsReadinessMetricDisplay[];
  reviewItems: AnalyticsReadinessReviewItemDisplay[];
}

const percent = (value: number) => `${Math.round(value)}%`;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function resolveAnalyticsViewMode(role?: string | null) {
  const normalized = (role ?? "").toLowerCase();
  return normalized.includes("owner") || normalized.includes("admin")
    ? "owner"
    : "manager";
}

export function displayAnalyticsReadinessSummary(
  summary: AnalyticsReadinessSummary,
  t: TFunction,
): AnalyticsReadinessSummaryDisplay {
  return {
    ...summary,
    metrics: summary.metrics.map((metric) => ({
      id: metric.id,
      label: t(metric.labelKey),
      value: metric.valueKey ? t(metric.valueKey) : metric.value,
      detail: t(metric.detailKey, metric.detailParams ?? {}),
      status: metric.status,
    })),
    reviewItems: summary.reviewItems.map((item) => ({
      id: item.id,
      label: t(item.labelKey),
      detail: t(item.detailKey, item.detailParams ?? {}),
      severity: item.severity,
    })),
  };
}

export function buildAnalyticsReadinessSummary({
  viewMode,
  business,
  forms,
  documents,
}: {
  viewMode: AnalyticsViewMode;
  business?: BusinessAnalyticsSnapshotResult | null;
  forms: FormWithMeta[];
  documents: DocumentWithRelations[];
}): AnalyticsReadinessSummary {
  const snapshot = business?.snapshot ?? null;
  const isFallback = business?.isFallback ?? true;
  const publishedForms = forms.filter((form) => form.status === "published");
  const activeForms = forms.filter((form) => form.status !== "archived");
  const formsWithSubmissions = activeForms.filter(
    (form) => (form.submissions_count ?? 0) > 0,
  );
  const readyReports = documents.filter(
    (document) => document.processing_state === "ready",
  );
  const pendingReports = documents.filter((document) =>
    ["pending", "processing"].includes(document.processing_state ?? "pending"),
  );
  const erroredReports = documents.filter(
    (document) => document.processing_state === "error",
  );
  const followUpActions = documents.reduce(
    (sum, document) => sum + (document.originating_tasks?.length ?? 0),
    0,
  );
  const forecastConfidence = snapshot?.metrics.forecastConfidence ?? 0;
  const marginRate = (snapshot?.metrics.marginRate ?? 0) * 100;
  const openShifts = snapshot?.breakdown.scheduling.openShifts ?? 0;
  const overdueTasks = snapshot?.breakdown.tasks.overdue ?? 0;
  const trailingRevenue = snapshot?.breakdown.revenue.trailing30 ?? 0;

  const exportReady =
    readyReports.length > 0 || formsWithSubmissions.length > 0 || Boolean(snapshot);
  const aiReady = Boolean(snapshot) && !isFallback && forecastConfidence > 0;
  const costEngineReady =
    Boolean(snapshot) &&
    !isFallback &&
    (trailingRevenue > 0 || (snapshot?.breakdown.scheduling.actualLaborHours ?? 0) > 0);

  const metrics: AnalyticsReadinessMetric[] =
    viewMode === "owner"
      ? [
          {
            id: "forecast-confidence",
            labelKey: "analytics.readinessMetricForecastConfidence",
            value: percent(forecastConfidence),
            detailKey: "analytics.readinessMetricForecastDetail",
            detailParams: {
              projected: money(snapshot?.breakdown.revenue.forecastNext30 ?? 0),
            },
            status: !isFallback && forecastConfidence >= 55 ? "ready" : "watch",
          },
          {
            id: "margin",
            labelKey: "analytics.readinessMetricMargin",
            value: percent(marginRate),
            detailKey: "analytics.readinessMetricMarginDetail",
            detailParams: { trailing: money(trailingRevenue) },
            status: costEngineReady ? "ready" : "watch",
          },
          {
            id: "report-exports",
            labelKey: "analytics.readinessMetricExportableReports",
            value: String(readyReports.length + formsWithSubmissions.length),
            detailKey: "analytics.readinessMetricExportableReportsDetail",
            detailParams: {
              readyDocs: readyReports.length,
              activeForms: formsWithSubmissions.length,
            },
            status: exportReady ? "ready" : "blocked",
          },
          {
            id: "ai-context",
            labelKey: "analytics.readinessMetricAiContext",
            value: "",
            valueKey: aiReady
              ? "analytics.readinessAiLive"
              : "analytics.readinessAiNeedsData",
            detailKey: "analytics.readinessMetricAiContextDetail",
            detailParams: { followUps: followUpActions },
            status: aiReady ? "ready" : "watch",
          },
        ]
      : [
          {
            id: "open-shifts",
            labelKey: "analytics.readinessMetricOpenShifts",
            value: String(openShifts),
            detailKey: "analytics.readinessMetricOpenShiftsDetail",
            detailParams: {
              coverage: percent((snapshot?.metrics.scheduleCoverage ?? 0) * 100),
            },
            status: openShifts === 0 ? "ready" : "watch",
          },
          {
            id: "overdue-tasks",
            labelKey: "analytics.readinessMetricOverdueTasks",
            value: String(overdueTasks),
            detailKey: "analytics.readinessMetricOverdueTasksDetail",
            detailParams: { backlog: snapshot?.breakdown.tasks.backlog ?? 0 },
            status: overdueTasks === 0 ? "ready" : "watch",
          },
          {
            id: "published-forms",
            labelKey: "analytics.readinessMetricPublishedForms",
            value: String(publishedForms.length),
            detailKey: "analytics.readinessMetricPublishedFormsDetail",
            detailParams: { withSubmissions: formsWithSubmissions.length },
            status: publishedForms.length > 0 ? "ready" : "watch",
          },
          {
            id: "report-processing",
            labelKey: "analytics.readinessMetricReportProcessing",
            value: String(pendingReports.length),
            detailKey: "analytics.readinessMetricReportProcessingDetail",
            detailParams: {
              ready: readyReports.length,
              errors: erroredReports.length,
            },
            status: erroredReports.length > 0 ? "blocked" : "ready",
          },
        ];

  const reviewItems: AnalyticsReadinessReviewItem[] = [
    ...(isFallback
      ? [
          {
            id: "fallback-data",
            labelKey: "analytics.readinessReviewFallbackLabel",
            detailKey: business?.notice
              ? "analytics.readinessReviewFallbackNoticeDetail"
              : "analytics.readinessReviewFallbackDefaultDetail",
            detailParams: business?.notice
              ? { notice: business.notice }
              : undefined,
            severity: "info" as const,
          },
        ]
      : []),
    ...(erroredReports.length > 0
      ? [
          {
            id: "errored-reports",
            labelKey: "analytics.readinessReviewErroredLabel",
            detailKey: "analytics.readinessReviewErroredDetail",
            detailParams: { count: erroredReports.length },
            severity: "critical" as const,
          },
        ]
      : []),
    ...(!exportReady
      ? [
          {
            id: "no-export-data",
            labelKey: "analytics.readinessReviewNoExportLabel",
            detailKey: "analytics.readinessReviewNoExportDetail",
            severity: "info" as const,
          },
        ]
      : []),
    ...(!costEngineReady
      ? [
          {
            id: "cost-engine-data",
            labelKey: "analytics.readinessReviewCostEngineLabel",
            detailKey: "analytics.readinessReviewCostEngineDetail",
            severity: "info" as const,
          },
        ]
      : []),
  ];

  return {
    viewMode,
    liveDataReady: !isFallback,
    exportReady,
    aiReady,
    costEngineReady,
    metrics,
    reviewItems,
  };
}