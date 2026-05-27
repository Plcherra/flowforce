/**
 * Hook for user management mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";
import {
  CREATE_COMPANY_INVITE_FN,
  type CreateInviteArgs,
} from "../types/userManagement";

interface UseUserManagementMutationsProps {
  onEmployeesRefetch: () => void;
  onInviteCreated?: (inviteLink: string) => void;
  onInviteFormReset?: () => void;
}

export function useUserManagementMutations({
  onEmployeesRefetch,
  onInviteCreated,
  onInviteFormReset,
}: UseUserManagementMutationsProps) {
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const queryClient = useQueryClient();

  const queryClientInvalidate = (key: string) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: string;
    }) => {
      const { data: previousProfile, error: previousError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (previousError) throw previousError;

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;

      await logAuditEvent({
        targetUserId: userId,
        action: AUDIT_ACTIONS.userRoleUpdated,
        tableName: "profiles",
        recordId: userId,
        oldValues: { role: previousProfile?.role ?? null },
        newValues: { role: newRole },
      });
    },
    onSuccess: () => {
      onEmployeesRefetch();
      queryClientInvalidate("inactive-employees");
      toast({
        title: "Role updated",
        description: "The user's role has been changed successfully.",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Unable to update role",
        description,
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "active" | "inactive";
    }) => {
      const { data: previousProfile, error: previousError } = await supabase
        .from("profiles")
        .select("employment_status")
        .eq("id", userId)
        .maybeSingle();

      if (previousError) throw previousError;

      const { error } = await supabase
        .from("profiles")
        .update({ employment_status: status })
        .eq("id", userId);
      if (error) throw error;

      await logAuditEvent({
        targetUserId: userId,
        action: AUDIT_ACTIONS.userStatusUpdated,
        tableName: "profiles",
        recordId: userId,
        oldValues: {
          employment_status: previousProfile?.employment_status ?? null,
        },
        newValues: { employment_status: status },
      });
    },
    onSuccess: (_, variables) => {
      onEmployeesRefetch();
      queryClientInvalidate("inactive-employees");
      toast({
        title:
          variables.status === "inactive"
            ? "User deactivated"
            : "User reactivated",
        description:
          variables.status === "inactive"
            ? "They will no longer appear in active scheduling."
            : "They are now available for active schedules and assignments.",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Unable to update status",
        description,
        variant: "destructive",
      });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (inviteForm: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    }) => {
      const auditMetadata = {
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        role: inviteForm.role,
      };

      const payload: CreateInviteArgs = {
        company_uuid: null as unknown as string,
        invite_email: inviteForm.email,
        invite_role: inviteForm.role,
        employee_first_name: inviteForm.firstName,
        employee_last_name: inviteForm.lastName,
        employee_birth_date: undefined,
        employee_phone: undefined,
      };

      const { data, error } = await supabase.rpc(
        CREATE_COMPANY_INVITE_FN,
        payload,
      );

      if (error) throw error;
      return {
        inviteCode: data as string,
        auditMetadata,
      };
    },
    onSuccess: ({ inviteCode, auditMetadata }) => {
      const link =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth?invite=${inviteCode}`
          : `/auth?invite=${inviteCode}`;
      onInviteCreated?.(link);
      onInviteFormReset?.();
      queryClientInvalidate("invites");
      toast({
        title: "Invite created",
        description: "The pre-account invite link has been generated.",
      });

      void logAuditEvent({
        targetUserId: null,
        action: AUDIT_ACTIONS.inviteCreated,
        tableName: "company_invites",
        recordId: null,
        newValues: {
          ...auditMetadata,
          inviteCode,
        },
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error
          ? error.message
          : "Please verify the details and try again.";
      toast({
        title: "Unable to create invite",
        description,
        variant: "destructive",
      });
    },
  });

  return {
    updateRoleMutation,
    deactivateMutation,
    createInviteMutation,
    resetPassword,
  };
}
