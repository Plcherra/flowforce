/**
 * Hook for week-level operations (copy, clear, publish)
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
          err instanceof Error ? err.message : t("literals.failedToCopyWeek");
        toast({
          title: t("literals.copyFailed"),
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
        const visibleShifts = supabase
          .from("schedules")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!)
          .gte("start_time", params.weekStart)
          .lt("start_time", params.weekEnd);
        const { count: beforeCount, error: countError } = await visibleShifts;
        if (countError) throw countError;

        const { data: deleted, error: schedulesError } = await supabase
          .from("schedules")
          .delete()
          .eq("company_id", companyId!)
          .gte("start_time", params.weekStart)
          .lt("start_time", params.weekEnd)
          .select("id");
        if (schedulesError) throw schedulesError;
        if ((beforeCount ?? 0) > 0 && (deleted?.length ?? 0) === 0) {
          throw new Error(t("schedule.clearWeekNeedsDelete"));
        }

        const { error: vendorsError } = await supabase
          .from("vendor_visits")
          .delete()
          .eq("company_id", companyId!)
          .gte("start_time", params.weekStart)
          .lt("start_time", params.weekEnd);
        if (vendorsError) throw vendorsError;

        await refetchAll();
        toast({
          title: t("literals.weekCleared"),
          description: t("literals.shiftsAndVendorEventsRemoved"),
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("literals.failedToClearWeek");
        toast({
          title: t("literals.clearFailed"),
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
      t,
      toast,
    ],
  );

  const publishWeek = useCallback(
    async (params: {
      weekStart: string;
      weekEnd: string;
      isPublished: boolean;
      blockingConflictCount?: number;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      const knownBlocking = params.blockingConflictCount ?? 0;
      if (params.isPublished && knownBlocking > 0) {
        toast({
          title: t("literals.publishBlocked"),
          description: t("literals.assignmentConflictWithStaffAvailabilityFixConflictsIn", { knownBlocking: knownBlocking, value1: knownBlocking === 1 ? "" : "s" }),
          variant: "destructive",
        });
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
            title: t("literals.publishBlocked"),
            description:
              blockingCount > 0
                ? t("literals.assignmentConflictWithStaffAvailabilityFixConflictsIn2", { blockingCount: blockingCount, value1: blockingCount === 1 ? "" : "s" })
                : t("literals.unableToPublishThisWeek"),
            variant: "destructive",
          });
          return false;
        }
        await refetchAll();
        toast({
          title: params.isPublished ? t("literals.weekPublished") : t("literals.weekUnpublished"),
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("literals.failedToUpdatePublicationStatus");
        toast({
          title: t("literals.actionFailed"),
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
