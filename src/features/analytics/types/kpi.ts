/**
 * Types for KPI tiles feature
 */

import type { LucideIcon } from "lucide-react";

export type TileId = "tasks" | "goals" | "scheduling" | "performance";

export interface TileDescriptor {
  id: TileId;
  title: string;
  icon: LucideIcon;
  accent: string;
  metric: string;
  metricLabel: string;
  secondary: string;
  trend: "up" | "down" | "flat";
  trendLabel: string;
  suggestion: string;
}

export interface TasksMetrics {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  dueSoon: number;
  highPriority: number;
  completionRate: number;
  overdueList: Array<{
    id: string;
    title: string;
    due_date: string | null;
  }>;
}

export interface GoalsMetrics {
  total: number;
  active: number;
  completed: number;
  draft: number;
  averageProgress: number;
  topActive: Array<{
    id: string;
    title: string;
    progress: number | null;
  }>;
}

export interface SchedulingMetrics {
  coverage: number;
  hoursUtilization: number;
  taskCompletion: number;
  todaysShifts: number;
  pendingTimeOff: number;
  hasCapacityGap: boolean;
  tasksBehind: boolean;
}

export interface PerformanceMetrics {
  averageCompletionRate: number;
  topPerformer: {
    first_name?: string | null;
    last_name?: string | null;
    completion_rate?: number | null;
    tasks?: number | null;
  } | null;
  topContributors: Array<{
    first_name?: string | null;
    last_name?: string | null;
    completion_rate?: number | null;
    tasks?: number | null;
  }>;
}
