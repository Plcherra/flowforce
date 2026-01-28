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
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
];
