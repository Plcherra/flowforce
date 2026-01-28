/**
 * Export utility functions for analytics
 */

import { format } from "date-fns";
import type { ComparisonRecord } from "../types/reports";

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
