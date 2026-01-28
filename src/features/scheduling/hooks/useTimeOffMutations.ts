/**
 * Hook for time off and unavailability mutations
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProfileSummary } from "@/hooks/scheduling/useSchedulingConsolidated";

interface UseTimeOffMutationsProps {
  companyId: string | null;
  userId: string | null;
  isUsingFallbackData: boolean;
  showReadOnlyNotice: () => void;
  refetchAll: () => Promise<void>;
  teamMembers: ProfileSummary[];
}

export function useTimeOffMutations({
  companyId,
  userId,
  isUsingFallbackData,
  showReadOnlyNotice,
  refetchAll,
  teamMembers,
}: UseTimeOffMutationsProps) {
  const { toast } = useToast();

  const addUnavailability = useCallback(
    async (payload: {
      userId: string;
      start: string;
      end: string;
      reason?: string | null;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      const isCompanyMember = teamMembers.some(
        (member) => member.id === payload.userId,
      );
      if (!isCompanyMember) {
        toast({
          title: "Unavailability rejected",
          description:
            "You can only submit availability updates for members of your company.",
          variant: "destructive",
        });
        return false;
      }

      try {
        const { error: insertError } = await supabase
          .from("user_unavailability")
          .insert({
            user_id: payload.userId,
            start_time: payload.start,
            end_time: payload.end,
            reason: payload.reason ?? null,
          });
        if (insertError) throw insertError;
        await refetchAll();
        toast({
          title: "Unavailability added",
          description: "The unavailability has been recorded.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add unavailability";
        toast({
          title: "Unavailability error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [isUsingFallbackData, refetchAll, showReadOnlyNotice, teamMembers, toast],
  );

  const requestTimeOff = useCallback(
    async (payload: {
      userId: string;
      startDate: string;
      endDate: string;
      type: "vacation" | "sick" | "personal" | "other";
      reason?: string | null;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        const { error: insertError } = await supabase
          .from("time_off_requests")
          .insert({
            user_id: payload.userId,
            start_date: payload.startDate,
            end_date: payload.endDate,
            type: payload.type,
            reason: payload.reason ?? "time off",
            status: "pending",
            notes: null,
            approved_by: null,
            approved_at: null,
          });
        if (insertError) throw insertError;
        await refetchAll();
        toast({
          title: "Time off requested",
          description: "Time off request submitted.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to request time off";
        toast({
          title: "Request failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [isUsingFallbackData, refetchAll, showReadOnlyNotice, toast],
  );

  const approveTimeOff = useCallback(
    async (requestId: string, notes?: string) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from("time_off_requests")
          .update({
            status: "approved",
            approved_by: userId ?? null,
            approved_at: new Date().toISOString(),
            notes: notes ?? undefined,
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        await refetchAll();
        toast({
          title: "Time off approved",
          description: "The time off request has been approved.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to approve time off request";
        toast({
          title: "Approval failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [isUsingFallbackData, refetchAll, showReadOnlyNotice, toast, userId],
  );

  return {
    addUnavailability,
    requestTimeOff,
    approveTimeOff,
  };
}
