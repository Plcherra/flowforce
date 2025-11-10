import { useCallback } from 'react';
import type { Goal, GoalStatus, UseGoalsReturn } from '@/hooks/useGoals';
import type { GoalFormValues } from '@/features/goals/components/CreateGoalModal';
import { buildRewardDetails } from '@/features/goals/utils/rewardUtils';

type GoalActionHandlers = Pick<
  UseGoalsReturn,
  'createGoal' | 'updateGoal' | 'deleteGoal' | 'toggleStatus'
>;

function mapFormValuesToPayload(values: GoalFormValues) {
  return {
    title: values.title,
    description: values.description ?? null,
    status: values.status,
    priority: values.priority,
    target_completion_date: values.dueDate ? values.dueDate.toISOString().split('T')[0] : null,
    progress: values.progress,
    reward_type: values.rewardType,
    reward_details: buildRewardDetails({
      rewardSummary: values.rewardSummary,
      xpValue: values.xpValue,
    }),
  };
}

export function useGoalActions({
  createGoal,
  updateGoal,
  deleteGoal,
  toggleStatus,
}: GoalActionHandlers) {
  const handleCreate = useCallback(
    async (values: GoalFormValues) => {
      const payload = mapFormValuesToPayload(values);
      await createGoal(payload);
    },
    [createGoal],
  );

  const handleUpdate = useCallback(
    async (goal: Goal, values: GoalFormValues) => {
      const updates = mapFormValuesToPayload(values);
      await updateGoal({ id: goal.id, updates });
    },
    [updateGoal],
  );

  const handleToggleStatus = useCallback(
    async (goal: Goal, status: GoalStatus) => {
      await toggleStatus({ id: goal.id, status });
    },
    [toggleStatus],
  );

  const deleteGoalById = useCallback(
    async (goalId: string) => {
      await deleteGoal(goalId);
    },
    [deleteGoal],
  );

  return {
    handleCreate,
    handleUpdate,
    handleToggleStatus,
    deleteGoalById,
  };
}
