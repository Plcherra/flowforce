/**
 * Types for reports analytics feature
 */

export type TimeRange = "7d" | "30d" | "90d";

export type CompareMetric = "volume" | "completion" | "engagement";

export interface ComparisonRecord {
  label: string;
  forms: number;
  reports: number;
}

export interface StatusBreakdownItem {
  status: string;
  value: number;
  color: string;
}

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--secondary))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];
