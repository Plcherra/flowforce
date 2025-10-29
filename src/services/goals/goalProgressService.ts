import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';

type GoalTaskRow = Tables<'goal_tasks'> & {
  task?: Pick<Tables<'tasks'>, 'status'> | null;
};

export const calculateGoalProgress = (
  goalTasks: GoalTaskRow[] | null | undefined,
  fallbackProgress = 0
) => {
  if (!goalTasks || goalTasks.length === 0) {
    return fallbackProgress;
  }

  const totalWeight = goalTasks.reduce((sum, goalTask) => {
    const weight = typeof goalTask.weight === 'number' ? goalTask.weight : 1;
    return sum + weight;
  }, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const completedWeight = goalTasks.reduce((sum, goalTask) => {
    const weight = typeof goalTask.weight === 'number' ? goalTask.weight : 1;
    const isCompleted = goalTask.task?.status === 'completed';
    return sum + (isCompleted ? weight : 0);
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
};

export const syncGoalProgress = async (goalId: string | null | undefined) => {
  if (!goalId) return;

  const { data: goalTasks, error: goalTasksError } = await supabase
    .from('goal_tasks')
    .select('id, weight, task:tasks(id, status)')
    .eq('goal_id', goalId);

  if (goalTasksError) {
    console.error('Error fetching goal tasks for progress sync:', goalTasksError);
    return;
  }

  const { data: goalData, error: goalError } = await supabase
    .from('goals')
    .select('status, completed_at, progress')
    .eq('id', goalId)
    .single();

  if (goalError) {
    console.error('Error fetching goal for progress sync:', goalError);
    return;
  }

  const progress = calculateGoalProgress(goalTasks ?? [], 0);

  const updates: Record<string, any> = {
    progress,
  };

  if (goalData?.status !== 'cancelled' && goalData?.status !== 'draft') {
    if (progress === 100 && goalData?.status !== 'completed') {
      updates.status = 'completed';
      updates.completed_at = goalData?.completed_at ?? new Date().toISOString();
    } else if (progress < 100 && goalData?.status === 'completed') {
      updates.status = 'active';
      updates.completed_at = null;
    }
  } else if (progress === 100 && goalData?.status === 'draft') {
    updates.status = 'completed';
    updates.completed_at = goalData?.completed_at ?? new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId);

  if (updateError) {
    console.error('Error updating goal progress:', updateError);
  }
};
