/**
 * Hook for generating KPI tile descriptors
 */

import { useMemo } from "react";
import { BarChart3, CalendarDays, CheckSquare, Target } from "lucide-react";
import type { TileDescriptor, TileId } from "../types/kpi";
import type {
  TasksMetrics,
  GoalsMetrics,
  SchedulingMetrics,
  PerformanceMetrics,
} from "../types/kpi";
import {
  generateCopilotMessages,
  generateAutomationMessages,
} from "../utils/copilotMessages";

interface UseKpiTilesProps {
  tasksMetrics: TasksMetrics;
  goalsMetrics: GoalsMetrics;
  schedulingMetrics: SchedulingMetrics;
  performanceMetrics: PerformanceMetrics;
}

export function useKpiTiles({
  tasksMetrics,
  goalsMetrics,
  schedulingMetrics,
  performanceMetrics,
}: UseKpiTilesProps) {
  const copilotMessages = useMemo(
    () =>
      generateCopilotMessages(
        tasksMetrics,
        goalsMetrics,
        schedulingMetrics,
        performanceMetrics,
      ),
    [tasksMetrics, goalsMetrics, schedulingMetrics, performanceMetrics],
  );

  const automationMessages = useMemo(() => generateAutomationMessages(), []);

  const tiles: TileDescriptor[] = useMemo(() => {
    const tilesConfig: TileDescriptor[] = [
      {
        id: "tasks",
        title: "Task Execution",
        icon: CheckSquare,
        accent: "bg-primary/10 text-primary",
        metric:
          tasksMetrics.total > 0 ? `${tasksMetrics.completionRate}%` : "—",
        metricLabel:
          tasksMetrics.total > 0
            ? `${tasksMetrics.completed} of ${tasksMetrics.total} completed`
            : "No tasks created",
        secondary:
          tasksMetrics.total > 0
            ? `${tasksMetrics.overdue} overdue • ${tasksMetrics.dueSoon} due soon`
            : "Co-Pilot is ready to open your first workflow",
        trend: tasksMetrics.overdue > 0 ? "down" : "up",
        trendLabel:
          tasksMetrics.total > 0
            ? tasksMetrics.overdue > 0
              ? `${tasksMetrics.overdue} to recover`
              : "On track"
            : "Getting started",
        suggestion: copilotMessages.tasks,
      },
      {
        id: "goals",
        title: "Goal Progress",
        icon: Target,
        accent:
          "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
        metric:
          goalsMetrics.total > 0 ? `${goalsMetrics.averageProgress}%` : "—",
        metricLabel:
          goalsMetrics.total > 0
            ? `${goalsMetrics.active} active • ${goalsMetrics.completed} completed`
            : "No goals in play",
        secondary:
          goalsMetrics.total > 0
            ? `${goalsMetrics.draft} draft goal${goalsMetrics.draft === 1 ? "" : "s"} waiting`
            : "Launch your first objective to align the team",
        trend:
          goalsMetrics.total === 0
            ? "flat"
            : goalsMetrics.averageProgress >= 70
              ? "up"
              : "down",
        trendLabel:
          goalsMetrics.total === 0
            ? "No baseline yet"
            : goalsMetrics.averageProgress >= 70
              ? "Pacing above target"
              : "Needs lift",
        suggestion: copilotMessages.goals,
      },
      {
        id: "scheduling",
        title: "Scheduling Health",
        icon: CalendarDays,
        accent:
          "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
        metric:
          schedulingMetrics.coverage > 0
            ? `${schedulingMetrics.coverage}%`
            : "—",
        metricLabel: "Coverage completeness",
        secondary: `${schedulingMetrics.hoursUtilization}% hours utilised • ${schedulingMetrics.taskCompletion}% tasks complete`,
        trend:
          schedulingMetrics.pendingTimeOff > 4
            ? "down"
            : schedulingMetrics.hasCapacityGap
              ? "down"
              : schedulingMetrics.tasksBehind
                ? "flat"
                : "up",
        trendLabel:
          schedulingMetrics.pendingTimeOff > 4
            ? "Pending PTO backlog"
            : schedulingMetrics.hasCapacityGap
              ? "Coverage gap"
              : schedulingMetrics.tasksBehind
                ? "Tasks lagging"
                : "Balanced",
        suggestion: copilotMessages.scheduling,
      },
      {
        id: "performance",
        title: "Performance Pulse",
        icon: BarChart3,
        accent:
          "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
        metric:
          performanceMetrics.averageCompletionRate > 0
            ? `${performanceMetrics.averageCompletionRate}%`
            : "—",
        metricLabel: performanceMetrics.topPerformer
          ? `Top: ${`${performanceMetrics.topPerformer.first_name ?? ""} ${performanceMetrics.topPerformer.last_name ?? ""}`.trim() || "Team Lead"}`
          : "Awaiting data",
        secondary:
          performanceMetrics.topContributors.length > 0
            ? `${performanceMetrics.topContributors.length} standout contributor${performanceMetrics.topContributors.length === 1 ? "" : "s"}`
            : "Bring in performance reviews to unlock insights",
        trend:
          performanceMetrics.averageCompletionRate === 0
            ? "flat"
            : performanceMetrics.averageCompletionRate >= 75
              ? "up"
              : "down",
        trendLabel:
          performanceMetrics.averageCompletionRate === 0
            ? "Need more signals"
            : performanceMetrics.averageCompletionRate >= 75
              ? "Healthy"
              : "Watchlist",
        suggestion: copilotMessages.performance,
      },
    ];

    return tilesConfig;
  }, [
    copilotMessages,
    goalsMetrics,
    performanceMetrics,
    schedulingMetrics,
    tasksMetrics,
  ]);

  const tileMap = useMemo(() => {
    return tiles.reduce<Record<TileId, TileDescriptor>>(
      (acc, tile) => {
        acc[tile.id] = tile;
        return acc;
      },
      {} as Record<TileId, TileDescriptor>,
    );
  }, [tiles]);

  return {
    tiles,
    tileMap,
    copilotMessages,
    automationMessages,
  };
}
