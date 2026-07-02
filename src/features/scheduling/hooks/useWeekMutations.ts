/**
 * Hook for week-level operations (copy, clear, publish)
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publishSchedulesWeekWithValidation } from "@/features/scheduling/repositories/schedulingRepository";
import { useToast } from "@/hooks/use-toast";
import { prepareShiftCopies } from "../utils/weekHelpers";
import type { ShiftInsertPayload } from "../types/mutations";

interface UseWeekMutationsProps {
  companyId: string | null;
  isUsingFallbackData: boolean;
  showReadOnlyNotice: () => void;
  refetchAll: () => Promise<void>;
  bulkCreateShifts: (payloads: ShiftInsertPayload[]) => Promise<boolean>;
  ensureCompanyContext: () => void;
}

export function useWeekMutations({
  companyId,
  isUsingFallbackData,
  showReadOnlyNotice,
  refetchAll,
  bulkCreateShifts,
  ensureCompanyContext,
}: UseWeekMutationsProps) {
  const { toast } = useToast();

  const copyWeek = useCallback(
    async (params: { sourceWeekStart: string; targetWeekStart: string }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        ensureCompanyContext();
        const sourceStart = new Date(params.sourceWeekStart);
        const sourceEnd = new Date(sourceStart);
        sourceEnd.setDate(sourceEnd.getDate() + 7);
        const targetStart = new Date(params.targetWeekStart);

        const { data, error: queryError } = await supabase
          .from("schedules")
          .select("*")
          .eq("company_id", companyId)
          .gte("start_time", sourceStart.toISOString())
          .lt("start_time", sourceEnd.toISOString());

        if (queryError) throw queryError;

        const payloads = prepareShiftCopies(
          data ?? [],
          sourceStart,
          targetStart,
        );

        return await bulkCreateShifts(payloads);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to copy week";
        toast({
          title: "Copy failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      bulkCreateShifts,
      companyId,
      ensureCompanyContext,
      isUsingFallbackData,
      showReadOnlyNotice,
      toast,
    ],
  );

  const clearWeek = useCallback(
    async (params: { weekStart: string; weekEnd: string }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        ensureCompanyContext();
        const { error: schedulesError } = await supabase
          .from("schedules")
          .delete()
          .eq("company_id", companyId!)
          .gte("start_time", params.weekStart)
          .lt("start_time", params.weekEnd);
        if (schedulesError) throw schedulesError;

        const { error: vendorsError } = await supabase
          .from("vendor_visits")
          .delete()
          .eq("company_id", companyId!)
          .gte("start_time", params.weekStart)
          .lt("start_time", params.weekEnd);
        if (vendorsError) throw vendorsError;

        await refetchAll();
        toast({
          title: "Week cleared",
          description: "Shifts and vendor events removed.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to clear week";
        toast({
          title: "Clear failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      companyId,
      ensureCompanyContext,
      isUsingFallbackData,
      refetchAll,
      showReadOnlyNotice,
      toast,
    ],
  );

  const publishWeek = useCallback(
    async (params: {
      weekStart: string;
      weekEnd: string;
      isPublished: boolean;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        ensureCompanyContext();
        const result = await publishSchedulesWeekWithValidation({
          companyId: companyId!,
          weekStart: params.weekStart,
          weekEnd: params.weekEnd,
          isPublished: params.isPublished,
        });
        if (!result.success) {
          const blockingCount = result.blocking_count ?? 0;
          toast({
            title: "Publish blocked",
            description:
              blockingCount > 0
                ? `${blockingCount} assignment${blockingCount === 1 ? "" : "s"} conflict with staff availability. Fix conflicts in the readiness panel.`
                : "Unable to publish this week.",
            variant: "destructive",
          });
          return false;
        }
        await refetchAll();
        toast({
          title: params.isPublished ? "Week published" : "Week unpublished",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update publication status";
        toast({
          title: "Action failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      companyId,
      ensureCompanyContext,
      isUsingFallbackData,
      refetchAll,
      showReadOnlyNotice,
      toast,
    ],
  );

  return {
    copyWeek,
    clearWeek,
    publishWeek,
  };
}
