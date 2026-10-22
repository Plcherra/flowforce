/**
 * Hook for time off and unavailability mutations
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { scheduleTimeOffTextTranslation } from "@/features/scheduling/scheduleShiftText";
import type { ProfileSummary } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import {
  requestFitsPolicy,
  type TimeOffPolicy,
  type TimeOffUsage,
} from "@/features/scheduling/utils/timeOffPolicy";

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
  const { i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);

  const addUnavailability = useCallback(
    async (payload: {
      userId: string;
      start: string;
      end: string;
      reason?: string | null;
      repeat?: {
        frequency: "daily" | "weekly" | "monthly" | "custom";
        interval: number;
        unit: "days" | "weeks";
        anchor: string;
      } | null;
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
            is_recurring: Boolean(payload.repeat),
            recurring_pattern: payload.repeat ?? null,
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
      policyId?: string | null;
      policies?: TimeOffPolicy[];
      usage?: TimeOffUsage[];
      roleId?: string | null;
      asOf?: string;
    }) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      const policies = payload.policies ?? [];
      if (policies.length > 0) {
        const policy = policies.find((item) => item.id === payload.policyId);
        if (!policy) {
          toast({
            title: "Choose a policy",
            description: "Pick the time off policy this request uses.",
            variant: "destructive",
          });
          return false;
        }
        const fit = requestFitsPolicy({
          policy,
          startDate: payload.startDate,
          endDate: payload.endDate,
          usage: (payload.usage ?? []).filter((row) => row.policyId === policy.id),
          userId: payload.userId,
          roleId: payload.roleId,
          asOf: payload.asOf ?? new Date().toISOString().slice(0, 10),
        });
        const reason = "reason" in fit ? fit.reason : null;
        if (reason) {
          toast({
            title: "Request does not fit the policy",
            description: reason,
            variant: "destructive",
          });
          return false;
        }
      }

      try {
        const reason = payload.reason ?? "time off";
        const { data: created, error: insertError } = await supabase
          .from("time_off_requests")
          .insert({
            user_id: payload.userId,
            company_id: companyId,
            start_date: payload.startDate.slice(0, 10),
            end_date: payload.endDate.slice(0, 10),
            type: payload.type,
            reason,
            status: "pending",
            notes: null,
            approved_by: null,
            approved_at: null,
            policy_id: payload.policyId ?? null,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        if (created?.id && companyId) {
          scheduleTimeOffTextTranslation({
            companyId,
            sourceId: created.id,
            sourceLocale,
            reason,
            notes: null,
          });
        }
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
    [companyId, isUsingFallbackData, refetchAll, showReadOnlyNotice, sourceLocale, toast],
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
        if (companyId && notes && notes.trim()) {
          scheduleTimeOffTextTranslation({
            companyId,
            sourceId: requestId,
            sourceLocale,
            notes,
          });
        }

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
    [companyId, isUsingFallbackData, refetchAll, showReadOnlyNotice, sourceLocale, toast, userId],
  );

  return {
    addUnavailability,
    requestTimeOff,
    approveTimeOff,
  };
}
