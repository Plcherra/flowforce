/**
 * Hook for calculating KPI tile metrics
 *
 * Aggregates and calculates metrics for KPI tiles including tasks, goals, scheduling,
 * and performance data. Returns memoized metrics objects for efficient rendering.
 *
 * @param props - KPI metrics calculation props
 * @param props.tasks - Array of tasks to analyze
 * @param props.goals - Array of goals to analyze
 * @param props.schedulingStats - Scheduling statistics (coverage, hours, etc.)
 * @param props.performanceData - Performance data array or null
 * @returns Memoized object containing tasksMetrics, goalsMetrics, schedulingMetrics, and performanceMetrics
 *
 * @example
 * ```tsx
 * const { tasksMetrics, goalsMetrics, schedulingMetrics, performanceMetrics } = useKpiMetrics({
 *   tasks,
 *   goals,
 *   schedulingStats,
 *   performanceData,
 * });
 * ```
 */

import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import type {
  TasksMetrics,
  GoalsMetrics,
  SchedulingMetrics,
  PerformanceMetrics,
} from "../types/kpi";
import { safeDate } from "@/shared/utils";

interface UseKpiMetricsProps {
  tasks: Array<{
    id?: string;
    status?: string | null;
    priority?: string | null;
    due_date?: string | null;
    title?: string | null;
    description?: string | null;
  }>;
  goals: Array<{
    id?: string;
    status?: string | null;
    progress?: number | null;
    title?: string | null;
  }>;
  schedulingStats: {
    coverageCompleteness?: number | null;
    hoursUtilization?: number | null;
    taskCompletion?: number | null;
    todaysShifts?: number | null;
    pendingTimeOff?: number | null;
  };
  performanceData: Array<{
    first_name?: string | null;
    last_name?: string | null;
    completion_rate?: number | null;
    tasks?: number | null;
  }> | null;
}

export function useKpiMetrics({
  tasks,
  goals,
  schedulingStats,
  performanceData,
}: UseKpiMetricsProps) {
  const tasksMetrics = useMemo((): TasksMetrics => {
    const now = new Date();
    const totals = {
      total: tasks.length,
      completed: 0,
      open: 0,
      overdue: 0,
      dueSoon: 0,
      highPriority: 0,
    };

    const overdueCandidates: Array<{
      id?: string;
      title?: string | null;
      due_date?: string | null;
      description?: string | null;
    }> = [];

    tasks.forEach((task) => {
      const status = (task.status ?? "").toLowerCase();
      const priority = (task.priority ?? "").toLowerCase();
      const isCompleted = status === "completed";
      const isCancelled = status === "cancelled";

      if (isCompleted) totals.completed += 1;

      if (!isCompleted && !isCancelled) {
        totals.open += 1;
        if (priority === "urgent" || priority === "high") {
          totals.highPriority += 1;
        }

        const due = safeDate(task.due_date);
        if (due) {
          if (due < now) {
            totals.overdue += 1;
            overdueCandidates.push({
              id: task.id,
              title: task.title,
              due_date: task.due_date,
              description: undefined,
            });
          } else if (differenceInDays(due, now) <= 3) {
            totals.dueSoon += 1;
          }
        }
      }
    });

    const completionRate =
      totals.total > 0
        ? Math.round((totals.completed / totals.total) * 100)
        : 0;
    const overdueList = overdueCandidates
      .sort((a, b) => {
        const aDate = safeDate(a.due_date)?.getTime() ?? 0;
        const bDate = safeDate(b.due_date)?.getTime() ?? 0;
        return aDate - bDate;
      })
      .slice(0, 3)
      .map((task) => ({
        id: task.id ?? "",
        title: task.title ?? "Untitled task",
        due_date: task.due_date ?? null,
      }));

    return { ...totals, completionRate, overdueList };
  }, [tasks]);

  const goalsMetrics = useMemo((): GoalsMetrics => {
    let active = 0;
    let completed = 0;
    let draft = 0;
    let totalProgress = 0;
    const activeGoals: Array<{
      id?: string;
      title?: string | null;
      progress?: number | null;
    }> = [];

    goals.forEach((goal) => {
      const status = (goal.status ?? "").toLowerCase();
      if (status === "completed") {
        completed += 1;
      } else if (status === "active") {
        active += 1;
        activeGoals.push(goal);
      } else {
        draft += 1;
      }
      totalProgress += goal.progress ?? 0;
    });

    const averageProgress =
      goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;
    const topActive = activeGoals
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 3)
      .map((goal) => ({
        id: goal.id ?? "",
        title: goal.title ?? "Untitled goal",
        progress: goal.progress ?? null,
      }));

    return {
      total: goals.length,
      active,
      completed,
      draft,
      averageProgress,
      topActive,
    };
  }, [goals]);

  const schedulingMetrics = useMemo((): SchedulingMetrics => {
    const coverage = schedulingStats.coverageCompleteness ?? 0;
    const hoursUtilization = schedulingStats.hoursUtilization ?? 0;
    const taskCompletion = schedulingStats.taskCompletion ?? 0;
    const hasCapacityGap = coverage < 80 || hoursUtilization > 110;
    const tasksBehind = taskCompletion < 60;

    return {
      coverage,
      hoursUtilization,
      taskCompletion,
      todaysShifts: schedulingStats.todaysShifts ?? 0,
      pendingTimeOff: schedulingStats.pendingTimeOff ?? 0,
      hasCapacityGap,
      tasksBehind,
    };
  }, [schedulingStats]);

  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const entries =
      (performanceData as Array<{
        completion_rate?: number | null;
        first_name?: string | null;
        last_name?: string | null;
        tasks?: number | null;
      }> | null) ?? [];

    if (entries.length === 0) {
      return {
        averageCompletionRate: 0,
        topPerformer: null,
        topContributors: [],
      };
    }

    const averageCompletionRate = Math.round(
      entries.reduce((sum, entry) => sum + (entry.completion_rate ?? 0), 0) /
        entries.length,
    );
    const sortedByCompletion = [...entries].sort(
      (a, b) => (b.completion_rate ?? 0) - (a.completion_rate ?? 0),
    );

    return {
      averageCompletionRate,
      topPerformer: sortedByCompletion[0] ?? null,
      topContributors: sortedByCompletion.slice(0, 4),
    };
  }, [performanceData]);

  return {
    tasksMetrics,
    goalsMetrics,
    schedulingMetrics,
    performanceMetrics,
  };
}
