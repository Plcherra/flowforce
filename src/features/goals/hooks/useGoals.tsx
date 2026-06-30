import { useMemo, useCallback } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { TablesInsert } from "@/integrations/supabase/public-types";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";
import {
  deleteGoalRow,
  fetchGoalRewards,
  fetchGoalsByCompany,
  fetchGoalTasks,
  insertGoalRow,
  updateGoalRow,
  updateGoalStatusRow,
} from "@/features/goals/repositories/goalsRepository";
import { fetchProfilesByIds } from "@/features/goals/repositories/profileRepository";
import { parseRewardDetails } from "@/features/goals/utils/rewardUtils";
import {
  buildOwnerMap,
  buildRecognitionMap,
  groupGoalTasks,
  parseRecognitionDetailsValue,
} from "@/features/goals/utils/goalEnrichers";
import type {
  CreateGoalInput,
  Goal,
  GoalRecognition,
  GoalStats,
  GoalStatus,
  GoalTaskWithDetails,
  OwnerProfile,
  UpdateGoalInput,
} from "@/features/goals/types";
export type {
  Goal,
  GoalStats,
  GoalStatus,
  GoalTaskWithDetails,
  GoalRecognition,
  OwnerProfile,
  CreateGoalInput,
  UpdateGoalInput,
} from "@/features/goals/types";

const DEFAULT_RECOGNITION_XP = 110;

const goalsQueryKey = (companyId: string | null) =>
  ["goals", companyId] as const;

async function fetchGoals(companyId: string): Promise<Goal[]> {
  const rows = await fetchGoalsByCompany(companyId);

  const ownerIds = Array.from(
    new Set(
      rows
        .map((goal) => goal.ownerid ?? goal.created_by)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let owners: Record<string, OwnerProfile> = {};
  if (ownerIds.length > 0) {
    const ownerProfiles = await fetchProfilesByIds(companyId, ownerIds);
    owners = buildOwnerMap(ownerProfiles);
  }

  const goalIds = rows.map((goal) => goal.id);
  let goalTasksMap = new Map<string, GoalTaskWithDetails[]>();
  let recognitionsMap = new Map<string, GoalRecognition[]>();

  if (goalIds.length > 0) {
    try {
      const taskLinks = await fetchGoalTasks(goalIds);
      goalTasksMap = groupGoalTasks(taskLinks);
    } catch (goalTasksError) {
      logger.warn("[useGoals] Failed to load goal task links", {
        error: goalTasksError,
        tags: ["warning"],
      });
    }

    let rewardList: Awaited<ReturnType<typeof fetchGoalRewards>> = [];
    try {
      rewardList = await fetchGoalRewards(goalIds, companyId);
    } catch (rewardsError) {
      logger.warn("[useGoals] Failed to load goal rewards", {
        error: rewardsError,
        tags: ["warning"],
      });
    }

    const rewardUserIds = Array.from(
      new Set(
        rewardList
          .map((reward) => reward.user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let rewardUsers: Record<string, OwnerProfile> = {};
    if (rewardUserIds.length > 0) {
      try {
        const rewardProfiles = await fetchProfilesByIds(
          companyId,
          rewardUserIds,
        );
        rewardUsers = buildOwnerMap(rewardProfiles);
      } catch (rewardProfileError) {
        logger.warn("[useGoals] Failed to load recognition recipients", {
          error: rewardProfileError,
          tags: ["warning"],
        });
      }
    }

    recognitionsMap = buildRecognitionMap({
      rewards: rewardList,
      rewardUsers,
      defaultXp: DEFAULT_RECOGNITION_XP,
    });
  }

  return rows.map((goal) => {
    const ownerId = goal.ownerid ?? goal.created_by ?? null;
    const goalTasks = goalTasksMap.get(goal.id) ?? [];
    const recognitionList = recognitionsMap.get(goal.id) ?? [];

    const xpSummary = recognitionList.reduce(
      (acc, recognition) => {
        acc.totalXp += recognition.xpAwarded;
        acc.rewardCount += 1;
        return acc;
      },
      { totalXp: 0, rewardCount: 0 },
    );

    const rewardDetails = parseRewardDetails(goal.reward_details);

    return {
      ...goal,
      owner: ownerId ? (owners[ownerId] ?? null) : null,
      tasks: goalTasks,
      recognitions: recognitionList,
      xpSummary,
      rewardSummary: rewardDetails.summary ?? "",
    };
  });
}

export function useGoals() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const invalidatePerformanceDataset = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["performance-dataset"] });
  }, [queryClient]);

  const windowCompanyId =
    typeof window !== "undefined" &&
    typeof (window as { activeCompanyId?: string }).activeCompanyId === "string"
      ? ((window as { activeCompanyId?: string }).activeCompanyId ?? null)
      : null;

  const companyId =
    profile?.companyId ?? profile?.company_id ?? windowCompanyId ?? null;
  const userId = profile?.userId ?? profile?.id ?? null;

  const goalsQuery = useQuery({
    throwOnError: false,
    retry: 1,
    queryKey: goalsQueryKey(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [] as Goal[];
      }
      return fetchGoals(companyId);
    },
    enabled: Boolean(companyId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!companyId || !userId) {
        throw new Error("Missing company context");
      }

      const payload: TablesInsert<"goals"> = {
        company_id: companyId,
        created_by: userId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "active",
        progress: input.progress ?? 0,
        priority: input.priority ?? "medium",
        target_completion_date: input.target_completion_date ?? null,
        reward_type: input.reward_type ?? "recognition",
        reward_details: input.reward_details ?? null,
        completed_at:
          input.status === "completed" ? new Date().toISOString() : null,
      };

      return insertGoalRow(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: goalsQueryKey(companyId),
      });
      void invalidatePerformanceDataset();
      toast({
        title: "Goal created",
        description: "Your new goal has been added",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to create goal";
      toast({
        title: "Create goal failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateGoalInput;
    }) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }
      await updateGoalRow(id, updates, companyId);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: goalsQueryKey(companyId),
      });
      void invalidatePerformanceDataset();
      toast({
        title: "Goal updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to update goal";
      toast({
        title: "Update goal failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }
      await deleteGoalRow(id, companyId);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: goalsQueryKey(companyId),
      });
      void invalidatePerformanceDataset();
      toast({
        title: "Goal removed",
        description: "The goal has been archived",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete goal";
      toast({
        title: "Delete goal failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoalStatus }) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }

      await updateGoalStatusRow(id, status, companyId);

      return id;
    },
    onSuccess: (id, variables) => {
      void queryClient.invalidateQueries({
        queryKey: goalsQueryKey(companyId),
      });
      void invalidatePerformanceDataset();
      toast({
        title: "Goal status updated",
        description: `Goal marked as ${variables.status}`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to update status";
      toast({
        title: "Status change failed",
        description: message,
        variant: "destructive",
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
        cancelled: 0,
        averageProgress: 0,
      };
    }

    const total = list.length;
    const active = list.filter((goal) => goal.status === "active").length;
    const completed = list.filter((goal) => goal.status === "completed").length;
    const drafts = list.filter((goal) => goal.status === "draft").length;
    const cancelled = list.filter((goal) => goal.status === "cancelled").length;
    const averageProgress = Math.round(
      list.reduce((sum, goal) => sum + (goal.progress ?? 0), 0) / total,
    );

    return {
      total,
      active,
      completed,
      drafts,
      cancelled,
      averageProgress,
    };
  }, [goalsQuery.data]);

  const queryError = goalsQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError && typeof queryError === "object" && "message" in queryError
        ? new Error(
            String(
              (queryError as { message?: unknown }).message ??
                "Failed to load goals",
            ),
          )
        : queryError
          ? new Error("Failed to load goals")
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
