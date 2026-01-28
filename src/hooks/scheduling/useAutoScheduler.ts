import { useCallback, useState } from "react";
import {
  runCopilotAutoSchedule,
  type AutoScheduleParams,
  type AutoScheduleResult,
} from "@/features/scheduling/services/autoScheduler";
import { useAuth } from "../useAuth";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useToast } from "../use-toast";
import { useProfile } from "../useProfile";

interface AutoScheduleState {
  loading: boolean;
  error: string | null;
  lastResult: AutoScheduleResult | null;
}

export function useAutoScheduler() {
  const { user } = useAuth();
  const { refetchAll } = useScheduling();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [state, setState] = useState<AutoScheduleState>({
    loading: false,
    error: null,
    lastResult: null,
  });

  const autoScheduleWeek = useCallback(
    async (params: AutoScheduleParams) => {
      if (!user) {
        const error = new Error("Must be signed in to run the copilot");
        setState((prev) => ({ ...prev, error: error.message }));
        throw error;
      }

      const companyId = profile?.companyId ?? null;
      if (!companyId) {
        const error = new Error(
          "A company must be selected before running the copilot",
        );
        setState((prev) => ({ ...prev, error: error.message }));
        throw error;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await runCopilotAutoSchedule(user.id, companyId, params);
        await refetchAll();
        setState({ loading: false, error: null, lastResult: result });

        toast({
          title: "Draft schedule ready",
          description: `${result.schedulesCreated.length} shifts drafted for ${result.locationName}.`,
        });

        return { data: result, error: null } as const;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to auto-schedule week";
        setState({ loading: false, error: message, lastResult: null });
        toast({
          title: "Auto-schedule failed",
          description: message,
          variant: "destructive",
        });
        return { data: null, error: message } as const;
      }
    },
    [profile?.companyId, refetchAll, toast, user],
  );

  return {
    autoScheduleWeek,
    loading: state.loading,
    lastResult: state.lastResult,
    error: state.error,
  };
}
