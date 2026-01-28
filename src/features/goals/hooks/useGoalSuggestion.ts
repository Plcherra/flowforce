import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Goal, GoalStats } from "@/hooks/useGoals";
import {
  buildGoalSuggestionPrompt,
  parseGoalSuggestionPayload,
} from "@/features/goals/utils/suggestionUtils";

type GoalSuggestionResponse = {
  insights?: string;
};

export function useGoalSuggestion(companyId: string | null) {
  const [suggesting, setSuggesting] = useState(false);

  const requestSuggestion = useCallback(
    async (stats: GoalStats, goals: Goal[]) => {
      if (!companyId) {
        throw new Error("Missing company context");
      }

      setSuggesting(true);
      try {
        const prompt = buildGoalSuggestionPrompt(stats, goals);
        const { data, error } =
          await supabase.functions.invoke<GoalSuggestionResponse>(
            "ai-insights",
            {
              body: {
                type: "chat",
                query: prompt,
                context: "goals_suggestion",
                companyId,
              },
            },
          );

        if (error) {
          throw error;
        }

        const suggestion = parseGoalSuggestionPayload(data?.insights);
        if (!suggestion) {
          throw new Error("No structured suggestion returned");
        }

        return suggestion;
      } finally {
        setSuggesting(false);
      }
    },
    [companyId],
  );

  return {
    suggesting,
    requestSuggestion,
  };
}
