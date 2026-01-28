import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { RecognitionRecord } from "@/types/recognition";
import {
  recognitionRepository,
  type ManualRecognitionInput,
} from "@/features/recognitions/api/recognitionRepository";

const DEFAULT_LOOKBACK_DAYS = 365;
const RECOGNITIONS_QUERY_KEY = "recognitions";

type UseRecognitionsOptions = {
  lookbackDays?: number | null;
};

export function useRecognitions(options?: UseRecognitionsOptions) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const companyId = profile?.companyId ?? null;
  const requestedLookback = options?.lookbackDays;
  const lookbackKey =
    requestedLookback === null
      ? "all"
      : typeof requestedLookback === "number"
        ? requestedLookback
        : DEFAULT_LOOKBACK_DAYS;

  const queryKey = useMemo(
    () => [RECOGNITIONS_QUERY_KEY, companyId, lookbackKey],
    [companyId, lookbackKey],
  );

  const recognitionsQuery = useQuery<RecognitionRecord[]>({
    queryKey,
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [];
      }
      return recognitionRepository.fetchRecognitionRecords({
        companyId,
        lookbackDays: requestedLookback,
      });
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const invalidateRecognitions = () => {
    if (!companyId) return;
    queryClient.invalidateQueries({
      queryKey: [RECOGNITIONS_QUERY_KEY, companyId],
    });
  };

  const createManualRecognitionMutation = useMutation({
    mutationFn: async (input: ManualRecognitionInput) => {
      if (!companyId || !user?.id) {
        throw new Error("You must be signed in to create recognitions.");
      }
      await recognitionRepository.createManualRecognition({
        companyId,
        actorId: user.id,
        input,
      });
    },
    onSuccess: invalidateRecognitions,
  });

  const automationMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !user?.id) {
        throw new Error("You must be signed in to sync recognitions.");
      }
      await recognitionRepository.syncRecognitionAutomation({
        companyId,
        actorId: user.id,
      });
    },
    onSettled: invalidateRecognitions,
  });

  return {
    recognitions: recognitionsQuery.data ?? [],
    loading: recognitionsQuery.isLoading,
    syncing: automationMutation.isPending,
    error: recognitionsQuery.error
      ? (recognitionsQuery.error as Error).message
      : null,
    refresh: () => recognitionsQuery.refetch(),
    syncAutomation: automationMutation.mutateAsync,
    createManualRecognition: createManualRecognitionMutation.mutateAsync,
  };
}
