/**
 * Hook for invite mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildInviteLink,
  triggerOnboardingChecklist,
} from "../utils/inviteHelpers";
import type {
  SingleInviteForm,
  BulkInviteRow,
  BulkInviteResult,
} from "../types/invites";

const COMPANY_INVITES_QUERY_KEY = ["employees", "company-invites"];

interface UseInviteMutationsProps {
  onInvitesCreated?: () => void;
}

export function useInviteMutations({
  onInvitesCreated,
}: UseInviteMutationsProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createInviteMutation = useMutation({
    mutationFn: async (payload: SingleInviteForm) => {
      const { data: inviteId, error } = await supabase.rpc(
        "create_company_invite",
        {
          company_uuid: null as unknown as string,
          invite_email: payload.email,
          invite_role: payload.role,
          employee_first_name: payload.firstName,
          employee_last_name: payload.lastName,
          employee_birth_date: payload.birthDate || null,
          employee_phone: payload.phone || null,
        },
      );

      if (error) throw error;

      const { data: inviteRecord, error: fetchError } = await supabase
        .from("company_invites")
        .select("invite_token")
        .eq("id", inviteId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!inviteRecord?.invite_token) {
        throw new Error("Invite token was not generated.");
      }

      const onboardingTriggered = await triggerOnboardingChecklist(
        inviteId as string,
      );

      return {
        inviteId: inviteId as string,
        inviteToken: inviteRecord.invite_token as string,
        onboardingTriggered,
      };
    },
    onSuccess: ({ _inviteToken, onboardingTriggered }) => {
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      toast({
        title: "Invite ready",
        description: onboardingTriggered
          ? "Invitation link generated and onboarding checklist triggered."
          : "Invitation link generated. Configure onboarding tasks manually if automation is disabled.",
        variant: onboardingTriggered ? undefined : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to create invite",
        description:
          error?.message ?? "Please verify the details and try again.",
        variant: "destructive",
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (rows: BulkInviteRow[]) => {
      const results: BulkInviteResult[] = [];

      for (const row of rows) {
        try {
          const { data: inviteId, error } = await supabase.rpc(
            "create_company_invite",
            {
              company_uuid: null as unknown as string,
              invite_email: row.email,
              invite_role: row.role,
              employee_first_name: row.firstName,
              employee_last_name: row.lastName,
              employee_birth_date: null,
              employee_phone: null,
            },
          );

          if (error) throw error;

          const { data: inviteRecord, error: fetchError } = await supabase
            .from("company_invites")
            .select("invite_token")
            .eq("id", inviteId)
            .maybeSingle();

          if (fetchError) throw fetchError;
          if (!inviteRecord?.invite_token) {
            throw new Error("Invite token missing for bulk invite.");
          }

          const onboardingTriggered = await triggerOnboardingChecklist(
            inviteId as string,
          );

          results.push({
            email: row.email,
            status: "success",
            inviteLink: buildInviteLink(inviteRecord.invite_token),
            onboardingTriggered,
          });
        } catch (error: any) {
          results.push({
            email: row.email,
            status: "error",
            message: error?.message ?? "Unknown error",
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      const failedOnboarding = results.filter(
        (result) =>
          result.status === "success" && result.onboardingTriggered === false,
      ).length;
      toast({
        title: "Bulk invites processed",
        description:
          failedOnboarding > 0
            ? `${results.length - failedOnboarding} invites ready. ${failedOnboarding} onboarding checklists need manual review.`
            : "Invitation links generated. Review any rows with issues below.",
        variant: failedOnboarding > 0 ? "destructive" : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk invite failed",
        description: error?.message ?? "Check the CSV format and try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createInviteMutation,
    bulkInviteMutation,
  };
}
