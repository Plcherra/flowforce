/**
 * Export utility functions for analytics
 */

import { format } from "date-fns";
import type { ComparisonRecord } from "../types/reports";
import type { AnalyticsReadinessSummary } from "@/features/analytics/utils/analyticsReadiness";

/**
 * Export reports analytics data to CSV
 */
export function exportReportsData(
  comparisonData: ComparisonRecord[],
  completionRate: number,
  accuracyScore: number,
  formsWithActivityCount: number,
  followUpActions: number,
): void {
  const rows = [
    ["Metric", "Forms", "Reports"],
    ...comparisonData.map((record) => [
      record.label,
      record.forms,
      record.reports,
    ]),
    ["Completion rate", `${completionRate}%`, `${accuracyScore}%`],
    ["Follow-ups", formsWithActivityCount, followUpActions],
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reports-analyzer-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsReadiness(
  summary: AnalyticsReadinessSummary,
): void {
  const rows = [
    ["View", summary.viewMode],
    ["Live data ready", summary.liveDataReady ? "yes" : "no"],
    ["Export ready", summary.exportReady ? "yes" : "no"],
    ["Cost engine ready", summary.costEngineReady ? "yes" : "no"],
    ["AI ready", summary.aiReady ? "yes" : "no"],
    [],
    ["Metric", "Value", "Status", "Detail"],
    ...summary.metrics.map((metric) => [
      metric.label,
      metric.value,
      metric.status,
      metric.detail,
    ]),
    [],
    ["Review item", "Severity", "Detail"],
    ...summary.reviewItems.map((item) => [
      item.label,
      item.severity,
      item.detail,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `analytics-readiness-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
