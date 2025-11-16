import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

type GoalTaskRow = Tables<'goal_tasks'>;
type TaskRow = Pick<Tables<'tasks'>, 'id' | 'title' | 'status' | 'priority' | 'due_date' | 'completed_at'>;

export type GoalTaskLink = GoalTaskRow & { task?: TaskRow | null };

export interface UseGoalTasksFilters {
  status?: string | string[];
  search?: string | null;
}

export interface UseGoalTasksOptions {
  goalId?: string | null;
  enabled?: boolean;
  filters?: UseGoalTasksFilters;
}

const GOAL_TASKS_SCOPE = ['gamification', 'goal-tasks'] as const;

const GOAL_TASKS_SELECT = `
  id,
  goal_id,
  task_id,
  milestone_id,
  weight,
  created_at,
  task:tasks (
    id,
    title,
    status,
    priority,
    due_date,
    completed_at
  )
`;

const normalizeSearch = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
};

const normalizeStatuses = (value: string | string[] | undefined) => {
  if (!value) return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list.length > 0 ? list.map((status) => status.toLowerCase()) : undefined;
};

const mapGoalTaskRow = (row: GoalTaskRow & { task?: TaskRow | null }): GoalTaskLink => ({
  id: row.id,
  goal_id: row.goal_id,
  task_id: row.task_id,
  milestone_id: row.milestone_id ?? null,
  created_at: row.created_at,
  weight: row.weight,
  task: row.task
    ? {
        id: row.task.id,
        title: row.task.title ?? '',
        status: row.task.status ?? '',
        priority: row.task.priority ?? null,
        due_date: row.task.due_date ?? null,
        completed_at: row.task.completed_at ?? null,
      }
    : null,
});

export function useGoalTasks(options: UseGoalTasksOptions = {}) {
  const { goalId, enabled = true, filters } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [...GOAL_TASKS_SCOPE, goalId ?? 'none'],
    [goalId],
  );

  const statusFilter = useMemo(() => normalizeStatuses(filters?.status), [filters?.status]);
  const searchFilter = useMemo(() => normalizeSearch(filters?.search), [filters?.search]);

  const goalTasksQuery = useQuery<GoalTaskLink[]>({
    queryKey,
    enabled: Boolean(enabled && goalId),
    queryFn: async () => {
      if (!goalId) {
        return [];
      }

      const { data, error } = await supabase
        .from('goal_tasks')
        .select(GOAL_TASKS_SELECT)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message ?? 'Failed to load goal tasks');
      }

      const mapped = (data ?? []).map((row) => mapGoalTaskRow(row as GoalTaskRow & { task?: TaskRow | null }));

      return mapped;
    },
    staleTime: 30_000,
  });

  const filteredTasks = useMemo(() => {
    let taskList = goalTasksQuery.data ?? [];
    if (statusFilter && statusFilter.length > 0) {
      taskList = taskList.filter((item) => {
        const status = item.task?.status?.toLowerCase() ?? '';
        return statusFilter.includes(status);
      });
    }
    if (searchFilter) {
      taskList = taskList.filter((item) => {
        const title = item.task?.title?.toLowerCase() ?? '';
        return title.includes(searchFilter);
      });
    }
    return taskList;
  }, [goalTasksQuery.data, statusFilter, searchFilter]);

  const invalidateGoalTasks = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const linkTaskMutation = useMutation({
    mutationFn: async ({ targetGoalId, taskId, weight }: { targetGoalId: string; taskId: string; weight?: number }) => {
      if (!targetGoalId || !taskId) {
        throw new Error('Both goalId and taskId are required.');
      }
      const payload: TablesInsert<'goal_tasks'> = {
        goal_id: targetGoalId,
        task_id,
        weight: typeof weight === 'number' ? weight : 1,
      };
      const { error } = await supabase.from('goal_tasks').insert(payload);
      if (error) {
        throw new Error(error.message ?? 'Failed to link task to goal');
      }
    },
    onSuccess: invalidateGoalTasks,
  });

  const unlinkTaskMutation = useMutation({
    mutationFn: async (goalTaskId: string) => {
      if (!goalTaskId) {
        throw new Error('goalTaskId is required for unlinking.');
      }
      const { error } = await supabase.from('goal_tasks').delete().eq('id', goalTaskId);
      if (error) {
        throw new Error(error.message ?? 'Failed to unlink task');
      }
    },
    onSuccess: invalidateGoalTasks,
  });

  const linkTaskToGoal = useCallback(
    (targetGoalId: string, taskId: string, weight?: number) =>
      linkTaskMutation.mutateAsync({ targetGoalId, taskId, weight }),
    [linkTaskMutation],
  );

  const unlinkTask = useCallback(
    (goalTaskId: string) => unlinkTaskMutation.mutateAsync(goalTaskId),
    [unlinkTaskMutation],
  );

  const queryError = goalTasksQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError
        ? new Error('Failed to load goal tasks')
        : null;

  return {
    goalTasks: filteredTasks,
    loading: goalTasksQuery.isLoading,
    error: normalizedError,
    refetch: goalTasksQuery.refetch,
    linkTaskToGoal,
    unlinkTask,
    linking: linkTaskMutation.isPending,
    unlinking: unlinkTaskMutation.isPending,
  };
}

export type UseGoalTasksReturn = ReturnType<typeof useGoalTasks>;
