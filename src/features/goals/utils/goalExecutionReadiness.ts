import { differenceInCalendarDays, isPast, isToday } from "date-fns";
import type { Goal } from "@/hooks/useGoals";

export interface GoalExecutionSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  dueThisWeekGoals: number;
  goalsWithoutTasks: number;
  linkedTasks: number;
  weightedTaskProgress: number;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

function goalTitle(goal: Goal) {
  return goal.title?.trim() || "Untitled goal";
}

function taskProgress(goal: Goal) {
  const tasks = goal.tasks ?? [];
  if (tasks.length === 0) return goal.progress ?? 0;

  const totalWeight = tasks.reduce(
    (sum, link) => sum + (typeof link.weight === "number" ? link.weight : 1),
    0,
  );
  if (totalWeight <= 0) return 0;

  const completedWeight = tasks.reduce((sum, link) => {
    const status = link.task?.status?.toLowerCase() ?? "";
    const weight = typeof link.weight === "number" ? link.weight : 1;
    return status === "completed" || status === "done" ? sum + weight : sum;
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
}

export function buildGoalExecutionSummary({
  goals,
  now = new Date(),
}: {
  goals: Goal[];
  now?: Date;
}): GoalExecutionSummary {
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.status === "completed");
  const overdueGoals = activeGoals.filter(
    (goal) =>
      goal.target_completion_date &&
      isPast(new Date(goal.target_completion_date)) &&
      !isToday(new Date(goal.target_completion_date)),
  );
  const dueThisWeekGoals = activeGoals.filter((goal) => {
    if (!goal.target_completion_date) return false;
    const days = differenceInCalendarDays(
      new Date(goal.target_completion_date),
      now,
    );
    return days >= 0 && days <= 7;
  });
  const goalsWithoutTasks = activeGoals.filter(
    (goal) => (goal.tasks ?? []).length === 0,
  );
  const linkedTasks = goals.reduce(
    (sum, goal) => sum + (goal.tasks?.length ?? 0),
    0,
  );
  const weightedTaskProgress =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, goal) => sum + taskProgress(goal), 0) /
            activeGoals.length,
        )
      : 0;

  const reviewItems = [
    ...overdueGoals.slice(0, 4).map((goal) => ({
      id: `overdue-${goal.id}`,
      label: "Overdue goal",
      detail: goalTitle(goal),
      severity: "critical" as const,
    })),
    ...goalsWithoutTasks.slice(0, 4).map((goal) => ({
      id: `notasks-${goal.id}`,
      label: "Goal has no tasks",
      detail: goalTitle(goal),
      severity: "warning" as const,
    })),
    ...activeGoals
      .filter((goal) => taskProgress(goal) === 0 && (goal.tasks ?? []).length > 0)
      .slice(0, 3)
      .map((goal) => ({
        id: `stalled-${goal.id}`,
        label: "No task progress yet",
        detail: goalTitle(goal),
        severity: "info" as const,
      })),
  ];

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    overdueGoals: overdueGoals.length,
    dueThisWeekGoals: dueThisWeekGoals.length,
    goalsWithoutTasks: goalsWithoutTasks.length,
    linkedTasks,
    weightedTaskProgress,
    reviewItems,
  };
}
