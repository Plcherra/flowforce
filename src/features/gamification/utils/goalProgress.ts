import type { Tables } from "@/integrations/supabase/public-types";

type GoalTaskRow = Tables<"goal_tasks"> & {
  task?: Pick<Tables<"tasks">, "status"> | null;
};

export const calculateGoalProgress = (
  goalTasks: GoalTaskRow[] | null | undefined,
  fallbackProgress = 0,
) => {
  if (!goalTasks || goalTasks.length === 0) {
    return fallbackProgress;
  }

  const totalWeight = goalTasks.reduce((sum, goalTask) => {
    const weight = typeof goalTask.weight === "number" ? goalTask.weight : 1;
    return sum + weight;
  }, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const completedWeight = goalTasks.reduce((sum, goalTask) => {
    const weight = typeof goalTask.weight === "number" ? goalTask.weight : 1;
    const isCompleted = goalTask.task?.status === "completed";
    return sum + (isCompleted ? weight : 0);
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
};
