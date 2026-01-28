import { supabase } from "@/integrations/supabase/client";
import { syncGoalProgress } from "./goalProgressService";

export async function linkTaskToGoal(
  goalId: string,
  taskId: string,
  weight: number,
) {
  const normalizedWeight = Number.isFinite(weight)
    ? Math.max(1, Math.min(5, Math.round(weight)))
    : 1;

  const { error } = await supabase.from("goal_tasks").upsert(
    {
      goal_id: goalId,
      task_id: taskId,
      weight: normalizedWeight,
    },
    {
      onConflict: "goal_id,task_id",
    },
  );

  if (error) {
    throw error;
  }

  await syncGoalProgress(goalId);
}

export async function unlinkTask(goalId: string, taskId: string) {
  const { error } = await supabase
    .from("goal_tasks")
    .delete()
    .eq("goal_id", goalId)
    .eq("task_id", taskId);

  if (error) {
    throw error;
  }

  await syncGoalProgress(goalId);
}
