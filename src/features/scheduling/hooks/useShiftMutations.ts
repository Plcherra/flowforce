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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ShiftInsertPayload } from "../types/mutations";
import type { ShiftUpsertInput } from "@/hooks/scheduling/useSchedulingConsolidated";
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
  upsertShift: (input: ShiftUpsertInput) => Promise<Tables<"schedules"> | null>;
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

  /**
   * Create a new shift
   * @param payload - Shift data to create
   * @returns Created shift record or null if failed/fallback mode
   */
  const createSchedule = useCallback(
    async (payload: ShiftInsertPayload) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }

      try {
        const result = await upsertShift(payload as ShiftUpsertInput);
        if (result) {
          toast({
            title: "Shift created",
            description: "New shift added to the schedule.",
          });
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create shift";
        toast({
          title: "Shift creation failed",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [isUsingFallbackData, showReadOnlyNotice, toast, upsertShift],
  );

  /**
   * Update an existing shift
   * @param id - Shift ID to update
   * @param updates - Partial shift data to update
   * @returns Updated shift record or null if failed/fallback mode
   */
  const updateSchedule = useCallback(
    async (id: string, updates: TablesUpdate<"schedules">) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }

      try {
        const result = await upsertShift({
          id,
          ...updates,
        } as ShiftUpsertInput);
        if (result) {
          toast({
            title: "Shift updated",
            description: "Shift details saved successfully.",
          });
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update shift";
        toast({
          title: "Shift update failed",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [isUsingFallbackData, showReadOnlyNotice, toast, upsertShift],
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
        const { error: deleteError } = await supabase
          .from("schedules")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId!);
        if (deleteError) throw deleteError;
        await refetchAll();
        toast({
          title: "Shift removed",
          description: "Shift deleted from the schedule.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete shift";
        toast({
          title: "Shift deletion failed",
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
            throw new Error(
              "Shift title, start_time, and end_time are required for bulk creation.",
            );
          }

          return {
            ...payload,
            company_id: companyId!,
            created_by: userId ?? null,
          };
        });

        const { error: insertError } = await supabase
          .from("schedules")
          .insert(normalizedPayloads);
        if (insertError) throw insertError;

        await refetchAll();

        toast({
          title: "Shifts created",
          description: `${payloads.length} shift${payloads.length === 1 ? "" : "s"} added to the schedule.`,
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create shifts";
        toast({
          title: "Shift creation failed",
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
