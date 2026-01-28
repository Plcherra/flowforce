/**
 * Types for task filtering
 */

export const KNOWN_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "blocked",
  "done",
  "completed",
  "cancelled",
] as const;

export const KNOWN_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export type KnownTaskStatus = (typeof KNOWN_STATUSES)[number];
export type KnownTaskPriority = (typeof KNOWN_PRIORITIES)[number];

export type TaskStatusFilter = KnownTaskStatus | "all" | "other";
export type TaskPriorityFilter = KnownTaskPriority | "all" | "other";

export interface DueBadge {
  label: string;
  className: string;
}

export type MetricTone = "neutral" | "alert";

export interface TaskMetric {
  label: string;
  value: number;
  helper: string;
  tone: MetricTone;
}
