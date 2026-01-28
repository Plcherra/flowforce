import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  insertIdeaAction,
  listIdeaActions,
  updateIdeaAction,
  type IdeaActionRecord,
} from "../data/ideaRepository";

export type IdeaActionStatus = "pending" | "executed" | "failed";

interface CreateActionInput {
  recommendationId?: string;
  action: string;
  impact?: string;
  autoExecute?: boolean;
  metadata?: Record<string, unknown>;
}

interface ExecuteActionOptions {
  actionId: string;
  result?: Record<string, unknown>;
}

interface IdeaActionsState {
  data: IdeaActionRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createAction: (input: CreateActionInput) => Promise<IdeaActionRecord>;
  execute: (options: ExecuteActionOptions) => Promise<IdeaActionRecord>;
}

export function useIdeaActions(
  companyId: string | undefined,
  cycleId: string | null,
): IdeaActionsState {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["idea-actions", companyId, cycleId ?? "all"],
    [companyId, cycleId],
  );

  const actionsQuery = useQuery<IdeaActionRecord[]>({
    queryKey,
    enabled: Boolean(companyId),
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Missing company context");
      }
      return listIdeaActions(companyId, cycleId);
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateActionInput) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }
      if (!cycleId) {
        throw new Error(
          "Missing IDEA cycle. Wait for diagnostics to start a cycle.",
        );
      }
      return insertIdeaAction({
        companyId,
        cycleId,
        action: input.action,
        recommendationId: input.recommendationId,
        autoExecute: input.autoExecute,
        impact: input.impact,
        metadata: input.metadata,
      });
    },
    onSuccess: invalidate,
  });

  const executeMutation = useMutation({
    mutationFn: async ({ actionId, result }: ExecuteActionOptions) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }
      return updateIdeaAction({
        companyId,
        actionId,
        result,
      });
    },
    onSuccess: invalidate,
  });

  return {
    data: actionsQuery.data ?? [],
    loading: actionsQuery.isLoading,
    error: (actionsQuery.error as Error) ?? null,
    refresh: invalidate,
    createAction: createMutation.mutateAsync,
    execute: executeMutation.mutateAsync,
  };
}
