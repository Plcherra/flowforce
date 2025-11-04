import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

export type GoalStatus = 'active' | 'completed' | 'draft';

export type GoalRow = Tables<'goals'>;

type OwnerProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export type Goal = GoalRow & {
  owner?: OwnerProfile | null;
};

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  drafts: number;
  averageProgress: number;
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  status?: GoalStatus;
  target_completion_date?: string | null;
  priority?: string | null;
  progress?: number;
}

export type UpdateGoalInput = TablesUpdate<'goals'>;

const goalsQueryKey = (companyId: string | null) => ['goals', companyId] as const;

type GoalRecord = GoalRow & {
  owner_id?: string | null;
};

async function fetchGoals(companyId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as GoalRecord[];
  const filteredRows = rows.filter((goal) => goal.company_id === companyId);

  if (filteredRows.length !== rows.length) {
    const removed = rows.length - filteredRows.length;
    console.warn('[useGoals] Filtered out goals from other companies', JSON.stringify({ removed, companyId }));
  }

  const ownerIds = Array.from(
    new Set(
      filteredRows
        .map((goal) => goal.owner_id ?? goal.created_by)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let owners: Record<string, OwnerProfile> = {};

  if (ownerIds.length > 0) {
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, company_id')
      .in('id', ownerIds)
      .eq('company_id', companyId);

    if (ownerError) {
      throw ownerError;
    }

    owners = (ownerData ?? [])
      .filter((profile) => profile.company_id === companyId)
      .reduce<Record<string, OwnerProfile>>((acc, profile) => {
        acc[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
        };
        return acc;
      }, {});
  }

  return filteredRows.map((goal) => {
    const ownerId = goal.owner_id ?? goal.created_by ?? null;
    return {
      ...goal,
      owner: ownerId ? owners[ownerId] ?? null : null,
    };
  });
}

export function useGoals() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const windowCompanyId =
    typeof window !== 'undefined' && typeof (window as { activeCompanyId?: string }).activeCompanyId === 'string'
      ? (window as { activeCompanyId?: string }).activeCompanyId ?? null
      : null;

  const companyId = profile?.companyId ?? profile?.company_id ?? windowCompanyId ?? null;
  const userId = profile?.userId ?? profile?.id ?? null;

  const goalsQuery = useQuery({
    queryKey: goalsQueryKey(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [] as Goal[];
      }
      return fetchGoals(companyId);
    },
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: 1,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!companyId || !userId) {
        throw new Error('Missing company context');
      }

      const payload: TablesInsert<'goals'> = {
        company_id: companyId,
        created_by: userId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'active',
        progress: input.progress ?? 0,
        priority: input.priority ?? 'medium',
        target_completion_date: input.target_completion_date ?? null,
        reward_type: null,
        reward_details: null,
        completed_at: input.status === 'completed' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data as GoalRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(companyId) });
      toast({
        title: 'Goal created',
        description: 'Your new goal has been added',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to create goal';
      toast({
        title: 'Create goal failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateGoalInput }) => {
      if (!companyId) {
        throw new Error('Missing company context');
      }
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(companyId) });
      toast({
        title: 'Goal updated',
        description: 'Changes saved successfully',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to update goal';
      toast({
        title: 'Update goal failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) {
        throw new Error('Missing company context');
      }
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(companyId) });
      toast({
        title: 'Goal removed',
        description: 'The goal has been archived',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to delete goal';
      toast({
        title: 'Delete goal failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoalStatus }) => {
      const updates: TablesUpdate<'goals'> = {
        status,
        progress: status === 'completed' ? 100 : undefined,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      };

      if (!companyId) {
        throw new Error('Missing company context');
      }

      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      return id;
    },
    onSuccess: (_id, variables) => {
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(companyId) });
      toast({
        title: 'Goal status updated',
        description: `Goal marked as ${variables.status}`,
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to update status';
      toast({
        title: 'Status change failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const stats: GoalStats = useMemo(() => {
    const list = goalsQuery.data ?? [];
    if (list.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        drafts: 0,
        averageProgress: 0,
      };
    }

    const total = list.length;
    const active = list.filter((goal) => goal.status === 'active').length;
    const completed = list.filter((goal) => goal.status === 'completed').length;
    const drafts = list.filter((goal) => goal.status === 'draft').length;
    const averageProgress = Math.round(
      list.reduce((sum, goal) => sum + (goal.progress ?? 0), 0) / total,
    );

    return {
      total,
      active,
      completed,
      drafts,
      averageProgress,
    };
  }, [goalsQuery.data]);

  const queryError = goalsQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError && typeof queryError === 'object' && 'message' in queryError
        ? new Error(String((queryError as { message?: unknown }).message ?? 'Failed to load goals'))
        : queryError
          ? new Error('Failed to load goals')
          : null;

  return {
    goals: goalsQuery.data ?? [],
    stats,
    loading: goalsQuery.isLoading,
    isLoading: goalsQuery.isLoading,
    isFetching: goalsQuery.isFetching,
    error: normalizedError,
    refetch: goalsQuery.refetch,
    refetchGoals: goalsQuery.refetch,
    calculateGoalProgress: (goal: Goal) => goal.progress ?? 0,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    creating: createGoalMutation.isPending,
    updating: updateGoalMutation.isPending,
    deleting: deleteGoalMutation.isPending,
    togglingStatus: toggleStatusMutation.isPending,
  };
}

export type UseGoalsReturn = ReturnType<typeof useGoals>;
