/**
 * Hook for managing shift-related mutations (create, update, delete, bulk operations)
 *
 * Provides mutation functions for scheduling operations with proper error handling,
 * toast notifications, and fallback data mode support.
 *
 * @example
 * ```tsx
 * const shiftMutations = useShiftMutations({
 *   companyId,
 *   userId: user?.id ?? null,
 *   isUsingFallbackData,
 *   showReadOnlyNotice,
 *   refetchAll,
 *   upsertShift,
 *   ensureCompanyContext,
 * });
 *
 * await shiftMutations.createSchedule(payload);
 * ```
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { scheduleShiftTextTranslation } from "@/features/scheduling/scheduleShiftText";
import { cancelTasksForShift } from "@/features/tasks/repositories/scheduleTaskSync";
import type {
  ShiftInsertPayload,
  SchedulingMutationOptions,
} from "../types/mutations";
import type { ShiftUpsertInput } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type {
  Tables,
  TablesUpdate,
} from "@/integrations/supabase/public-types";

/**
 * Props for useShiftMutations hook
 */
interface UseShiftMutationsProps {
  /** Company ID for multi-tenant isolation */
  companyId: string | null;
  /** User ID for tracking who created/modified shifts */
  userId: string | null;
  /** Whether the app is using fallback/mock data */
  isUsingFallbackData: boolean;
  /** Callback to show read-only notice when mutations are attempted in fallback mode */
  showReadOnlyNotice: () => void;
  /** Function to refetch all scheduling data after mutations */
  refetchAll: () => Promise<void>;
  /** Function to upsert a shift in the database */
  upsertShift: (
    input: ShiftUpsertInput,
    options?: SchedulingMutationOptions,
  ) => Promise<Tables<"schedules"> | null>;
  /** Function to ensure company context is available (throws if not) */
  ensureCompanyContext: () => void;
}

export function useShiftMutations({
  companyId,
  userId,
  isUsingFallbackData,
  showReadOnlyNotice,
  refetchAll,
  upsertShift,
  ensureCompanyContext,
}: UseShiftMutationsProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);

  /**
   * Create a new shift
   * @param payload - Shift data to create
   * @returns Created shift record or null if failed/fallback mode
   */
  const createSchedule = useCallback(
    async (payload: ShiftInsertPayload, options?: SchedulingMutationOptions) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }

      try {
        const result = await upsertShift(payload as ShiftUpsertInput, options);
        if (result && !options?.silent) {
          toast({
            title: t("schedule.shiftCreated"),
            description: t("schedule.shiftCreatedHelp"),
          });
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("schedule.failedToCreateShift");
        toast({
          title: t("schedule.shiftCreationFailed"),
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [isUsingFallbackData, showReadOnlyNotice, t, toast, upsertShift],
  );

  /**
   * Update an existing shift
   * @param id - Shift ID to update
   * @param updates - Partial shift data to update
   * @returns Updated shift record or null if failed/fallback mode
   */
  const updateSchedule = useCallback(
    async (
      id: string,
      updates: TablesUpdate<"schedules">,
      options?: SchedulingMutationOptions,
    ) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }

      try {
        const result = await upsertShift(
          {
            id,
            ...updates,
          } as ShiftUpsertInput,
          options,
        );
        if (result && !options?.silent) {
          toast({
            title: t("schedule.shiftUpdated"),
            description: t("schedule.shiftUpdatedHelp"),
          });
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("schedule.failedToUpdateShift");
        toast({
          title: t("schedule.shiftUpdateFailed"),
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [isUsingFallbackData, showReadOnlyNotice, t, toast, upsertShift],
  );

  /**
   * Delete a shift
   * @param id - Shift ID to delete
   * @returns true if successful, false otherwise
   */
  const deleteSchedule = useCallback(
    async (id: string) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        ensureCompanyContext();
        await cancelTasksForShift(id);
        const { error: deleteError } = await supabase
          .from("schedules")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId!);
        if (deleteError) throw deleteError;
        await refetchAll();
        toast({
          title: t("schedule.shiftRemoved"),
          description: t("schedule.shiftRemovedHelp"),
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("schedule.failedToDeleteShift");
        toast({
          title: t("schedule.shiftDeleteFailed"),
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

  /**
   * Create multiple shifts in a single operation
   * @param payloads - Array of shift data to create
   * @returns true if all shifts created successfully, false otherwise
   */
  const bulkCreateShifts = useCallback(
    async (payloads: ShiftInsertPayload[]) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      if (!payloads.length) return true;

      try {
        ensureCompanyContext();

        const normalizedPayloads = payloads.map((payload) => {
          if (!payload.title || !payload.start_time || !payload.end_time) {
            throw new Error(t("schedule.shiftTimesRequired"));
          }

          return {
            ...payload,
            company_id: companyId!,
            created_by: userId ?? null,
          };
        });

        const { data: createdRows, error: insertError } = await supabase
          .from("schedules")
          .insert(normalizedPayloads)
          .select("id, title, notes");
        if (insertError) throw insertError;
        if (companyId) {
          for (const row of createdRows ?? []) {
            if (!row.id) continue;
            scheduleShiftTextTranslation({
              companyId,
              sourceId: row.id,
              sourceLocale,
              title: row.title,
              notes: row.notes,
            });
          }
        }

        await refetchAll();

        toast({
          title: t("schedule.shiftsCreated"),
          description: t("schedule.shiftsCreatedHelp", {
            count: payloads.length,
          }),
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("schedule.failedToCreateShifts");
        toast({
          title: t("schedule.shiftCreationFailed"),
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
      sourceLocale,
      t,
      toast,
      userId,
    ],
  );

  return {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    bulkCreateShifts,
  };
}
