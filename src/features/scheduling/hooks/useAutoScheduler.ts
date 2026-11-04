import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  runCopilotAutoSchedule,
  type AutoScheduleParams,
  type AutoScheduleResult,
} from "@/features/scheduling/services/autoScheduler";
import { useAuth } from "@/hooks/useAuth";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

interface AutoScheduleState {
  loading: boolean;
  error: string | null;
  lastResult: AutoScheduleResult | null;
}

export function useAutoScheduler() {
  const { user } = useAuth();
  const { refetchAll } = useScheduling();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [state, setState] = useState<AutoScheduleState>({
    loading: false,
    error: null,
    lastResult: null,
  });

  const autoScheduleWeek = useCallback(
    async (params: AutoScheduleParams) => {
      if (!user) {
        const error = new Error(t("schedule.mustBeSignedIn"));
        setState((prev) => ({ ...prev, error: error.message }));
        throw error;
      }

      const companyId = profile?.companyId ?? null;
      if (!companyId) {
        const error = new Error(
          t("schedule.companyRequiredForCopilot"),
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
          title: t("schedule.draftScheduleReady"),
          description: t("schedule.shiftsDraftedFor", {
            count: result.schedulesCreated.length,
            location: result.locationName,
          }),
        });

        return { data: result, error: null } as const;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("schedule.failedToAutoSchedule");
        setState({ loading: false, error: message, lastResult: null });
        toast({
          title: t("schedule.autoScheduleFailed"),
          description: message,
          variant: "destructive",
        });
        return { data: null, error: message } as const;
      }
    },
    [profile?.companyId, refetchAll, t, toast, user],
  );

  return {
    autoScheduleWeek,
    loading: state.loading,
    lastResult: state.lastResult,
    error: state.error,
  };
}
