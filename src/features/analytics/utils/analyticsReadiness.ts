import type { BusinessAnalyticsSnapshotResult } from "@/services/analytics/businessAnalyticsService";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import type { DocumentWithRelations } from "@/types/ingestion";

export type AnalyticsViewMode = "owner" | "manager";

export interface AnalyticsReadinessMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: "ready" | "watch" | "blocked";
}

export interface AnalyticsReadinessSummary {
  viewMode: AnalyticsViewMode;
  liveDataReady: boolean;
  exportReady: boolean;
  aiReady: boolean;
  costEngineReady: boolean;
  metrics: AnalyticsReadinessMetric[];
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
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
            label: "Forecast confidence",
            value: percent(forecastConfidence),
            detail: `${money(snapshot?.breakdown.revenue.forecastNext30 ?? 0)} projected`,
            status: !isFallback && forecastConfidence >= 55 ? "ready" : "watch",
          },
          {
            id: "margin",
            label: "Margin",
            value: percent(marginRate),
            detail: `${money(trailingRevenue)} trailing revenue`,
            status: costEngineReady ? "ready" : "watch",
          },
          {
            id: "report-exports",
            label: "Exportable reports",
            value: String(readyReports.length + formsWithSubmissions.length),
            detail: `${readyReports.length} ready docs, ${formsWithSubmissions.length} active forms`,
            status: exportReady ? "ready" : "blocked",
          },
          {
            id: "ai-context",
            label: "AI context",
            value: aiReady ? "Live" : "Needs data",
            detail: `${followUpActions} follow-up actions linked`,
            status: aiReady ? "ready" : "watch",
          },
        ]
      : [
          {
            id: "open-shifts",
            label: "Open shifts",
            value: String(openShifts),
            detail: `${percent((snapshot?.metrics.scheduleCoverage ?? 0) * 100)} coverage`,
            status: openShifts === 0 ? "ready" : "watch",
          },
          {
            id: "overdue-tasks",
            label: "Overdue tasks",
            value: String(overdueTasks),
            detail: `${snapshot?.breakdown.tasks.backlog ?? 0} task backlog`,
            status: overdueTasks === 0 ? "ready" : "watch",
          },
          {
            id: "published-forms",
            label: "Published forms",
            value: String(publishedForms.length),
            detail: `${formsWithSubmissions.length} with submissions`,
            status: publishedForms.length > 0 ? "ready" : "watch",
          },
          {
            id: "report-processing",
            label: "Report processing",
            value: String(pendingReports.length),
            detail: `${readyReports.length} ready, ${erroredReports.length} errors`,
            status: erroredReports.length > 0 ? "blocked" : "ready",
          },
        ];

  const reviewItems = [
    ...(isFallback
      ? [
          {
            id: "fallback-data",
            label: "Live analytics data unavailable",
            detail: business?.notice ?? "Business analytics is using simulator defaults.",
            severity: "info" as const,
          },
        ]
      : []),
    ...(erroredReports.length > 0
      ? [
          {
            id: "errored-reports",
            label: "Report extraction errors",
            detail: `${erroredReports.length} uploaded reports need attention.`,
            severity: "critical" as const,
          },
        ]
      : []),
    ...(!exportReady
      ? [
          {
            id: "no-export-data",
            label: "No exportable reporting data",
            detail: "Upload reports or collect form submissions before pilot reporting.",
            severity: "info" as const,
          },
        ]
      : []),
    ...(!costEngineReady
      ? [
          {
            id: "cost-engine-data",
            label: "Cost engine data is thin",
            detail: "Revenue, inventory, expense, or labor data is needed for stronger owner reports.",
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
