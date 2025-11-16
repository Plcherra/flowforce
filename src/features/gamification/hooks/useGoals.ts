import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';
import { useProfile } from '@/hooks/useProfile';
import { calculateGoalProgress } from '@/services/goals/goalProgressService';

type GoalRow = Tables<'goals'>;
type GoalTaskRow = Tables<'goal_tasks'>;
type TaskRow = Pick<Tables<'tasks'>, 'id' | 'title' | 'status' | 'priority' | 'due_date' | 'completed_at'>;

type RawGoalRecord = GoalRow & {
  goal_tasks?: (GoalTaskRow & { task: TaskRow | null })[] | null;
};

export type GoalTaskLink = GoalTaskRow & { task?: TaskRow | null };

export type GoalWithTasks = GoalRow & {
  tasks: GoalTaskLink[];
  computedProgress: number;
};

export interface UseGoalsFilters {
  companyId?: string | null;
  status?: string | string[];
  ownerId?: string | null;
  search?: string | null;
}

export interface UseGoalsOptions {
  filters?: UseGoalsFilters;
  enabled?: boolean;
}

export type CreateGoalInput = Omit<TablesInsert<'goals'>, 'company_id' | 'created_by'> & {
  company_id?: string;
  created_by?: string;
};

export type UpdateGoalInput = TablesUpdate<'goals'>;

const GOALS_SELECT = `
  id,
  company_id,
  created_by,
  owner_id,
  title,
  description,
  status,
  progress,
  priority,
  reward_type,
  reward_details,
  target_completion_date,
  created_at,
  updated_at,
  completed_at,
  goal_tasks:goal_tasks (
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
  )
`;

const GOALS_QUERY_SCOPE = ['gamification', 'goals'] as const;

const normalizeSearch = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
};

function mapGoalRecord(record: RawGoalRecord): GoalWithTasks {
  const tasks: GoalTaskLink[] = Array.isArray(record.goal_tasks)
    ? record.goal_tasks.map((taskLink) => ({
        id: taskLink.id,
        goal_id: taskLink.goal_id,
        task_id: taskLink.task_id,
        milestone_id: taskLink.milestone_id ?? null,
        created_at: taskLink.created_at,
        weight: taskLink.weight,
        task: taskLink.task
          ? {
              id: taskLink.task.id,
              title: taskLink.task.title ?? '',
              status: taskLink.task.status ?? '',
              priority: taskLink.task.priority ?? null,
              due_date: taskLink.task.due_date ?? null,
              completed_at: taskLink.task.completed_at ?? null,
            }
          : null,
      }))
    : [];

  const fallbackProgress = typeof record.progress === 'number' ? record.progress : 0;
  const computedProgress =
    tasks.length > 0
      ? calculateGoalProgress(tasks as Parameters<typeof calculateGoalProgress>[0], fallbackProgress)
      : fallbackProgress;

  const { goal_tasks, ...goalFields } = record;
  return {
    ...goalFields,
    tasks,
    computedProgress,
  };
}

export function useGoals(options: UseGoalsOptions = {}) {
  const { filters, enabled = true } = options;
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const fallbackCompanyId = profile?.companyId ?? profile?.company_id ?? null;
  const userId = profile?.userId ?? profile?.id ?? null;

  const normalizedFilters = useMemo(() => {
    return {
      companyId: filters?.companyId ?? fallbackCompanyId,
      status: filters?.status,
      ownerId: filters?.ownerId ?? undefined,
      search: normalizeSearch(filters?.search),
    };
  }, [filters?.companyId, filters?.status, filters?.ownerId, filters?.search, fallbackCompanyId]);

  const filterKey = useMemo(() => JSON.stringify(normalizedFilters), [normalizedFilters]);

  const goalsQuery = useQuery<GoalWithTasks[]>({
    queryKey: [...GOALS_QUERY_SCOPE, filterKey],
    enabled: Boolean(enabled && normalizedFilters.companyId),
    queryFn: async () => {
      const companyId = normalizedFilters.companyId;
      if (!companyId) {
        return [];
      }

      let query = supabase
        .from('goals')
        .select(GOALS_SELECT)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (normalizedFilters.status) {
        const statuses = Array.isArray(normalizedFilters.status)
          ? normalizedFilters.status
          : [normalizedFilters.status];
        if (statuses.length > 0) {
          query = query.in('status', statuses);
        }
      }

      if (normalizedFilters.ownerId) {
        query = query.eq('owner_id', normalizedFilters.ownerId);
      }

      if (normalizedFilters.search) {
        query = query.ilike('title', `%${normalizedFilters.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message ?? 'Failed to load goals');
      }

      return (data ?? []).map((record) => mapGoalRecord(record as RawGoalRecord));
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const invalidateGoalQueries = () => {
    queryClient.invalidateQueries({ queryKey: GOALS_QUERY_SCOPE });
  };

  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const companyId = input.company_id ?? normalizedFilters.companyId;
      if (!companyId) {
        throw new Error('A companyId is required to create goals.');
      }
      const creatorId = input.created_by ?? userId;
      if (!creatorId) {
        throw new Error('Missing user context for goal creation.');
      }
      const payload: TablesInsert<'goals'> = {
        ...input,
        company_id: companyId,
        created_by: creatorId,
      };
      const { error } = await supabase.from('goals').insert(payload);
      if (error) {
        throw new Error(error.message ?? 'Failed to create goal');
      }
    },
    onSuccess: invalidateGoalQueries,
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateGoalInput }) => {
      if (!id) {
        throw new Error('Goal id is required for updates.');
      }
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id);
      if (error) {
        throw new Error(error.message ?? 'Failed to update goal');
      }
    },
    onSuccess: invalidateGoalQueries,
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        throw new Error('Goal id is required for deletion.');
      }
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) {
        throw new Error(error.message ?? 'Failed to delete goal');
      }
    },
    onSuccess: invalidateGoalQueries,
  });

  const queryError = goalsQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError
        ? new Error('Unable to load goals')
        : null;

  return {
    goals: goalsQuery.data ?? [],
    loading: goalsQuery.isLoading,
    error: normalizedError,
    refetch: goalsQuery.refetch,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    creating: createGoalMutation.isPending,
    updating: updateGoalMutation.isPending,
    deleting: deleteGoalMutation.isPending,
  };
}

export type UseGoalsReturn = ReturnType<typeof useGoals>;
