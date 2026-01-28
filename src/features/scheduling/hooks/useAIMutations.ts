/**
 * Hook for AI-related scheduling operations
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AIRecommendation } from "../types/mutations";

interface UseAIMutationsProps {
  companyId: string | null;
  isUsingFallbackData: boolean;
  showReadOnlyNotice: () => void;
  refetchAll: () => Promise<void>;
}

export function useAIMutations({
  companyId,
  isUsingFallbackData,
  showReadOnlyNotice,
  refetchAll,
}: UseAIMutationsProps) {
  const { toast } = useToast();

  const autoGenerateWeek = useCallback(
    async (params: {
      weekStart: string;
      preferences?: Record<string, unknown>;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-scheduling-assistant",
          {
            body: {
              action: "auto_schedule",
              data: {
                companyId: companyId ?? "current",
                weekStart: params.weekStart,
                preferences: params.preferences ?? {
                  balance: true,
                  fairness: true,
                },
              },
            },
          },
        );

        if (fnError) throw fnError;

        await refetchAll();
        toast({
          title: "AI schedule generated",
          description: data?.schedule?.shifts?.length
            ? `${data.schedule.shifts.length} shifts created`
            : "Schedule optimization completed.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate schedule";
        toast({
          title: "Auto-scheduling failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [companyId, isUsingFallbackData, refetchAll, showReadOnlyNotice, toast],
  );

  const generateRecommendations = useCallback(
    async (scheduleId: string) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return [];
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-scheduling-assistant",
          {
            body: {
              action: "generate_recommendations",
              data: {
                scheduleId,
                companyId: companyId ?? "current",
              },
            },
          },
        );

        if (fnError) throw fnError;

        const recommendations = Array.isArray(data?.recommendations)
          ? (data.recommendations as AIRecommendation[])
          : [];
        return recommendations;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to fetch recommendations";
        toast({
          title: "AI recommendations unavailable",
          description: message,
          variant: "destructive",
        });
        return [];
      }
    },
    [companyId, isUsingFallbackData, showReadOnlyNotice, toast],
  );

  return {
    autoGenerateWeek,
    generateRecommendations,
  };
}
