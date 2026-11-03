/**
 * Hook for user management mutations
 */

import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { saveEmployeeAccess } from "@/features/employees/utils/saveEmployeeAccess";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";

interface UseUserManagementMutationsProps {
  onEmployeesRefetch: () => void;
}

export function useUserManagementMutations({
  onEmployeesRefetch,
}: UseUserManagementMutationsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const queryClient = useQueryClient();

  const queryClientInvalidate = (key: string) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { data: previousProfile, error: previousError } = await supabase
        .from("profiles")
        .select("role, role_id")
        .eq("id", userId)
        .maybeSingle();

      if (previousError) throw previousError;

      const result = await saveEmployeeAccess({ userId, roleId });

      await logAuditEvent({
        targetUserId: userId,
        action: AUDIT_ACTIONS.userRoleUpdated,
        tableName: "profiles",
        recordId: userId,
        oldValues: {
          role: previousProfile?.role ?? null,
          role_id: previousProfile?.role_id ?? null,
        },
        newValues: {
          role: result.role ?? null,
          role_id: result.roleId ?? roleId,
        },
      });
    },
    onSuccess: () => {
      onEmployeesRefetch();
      queryClientInvalidate("inactive-employees");
      toast({
        title: t("literals.roleUpdated"),
        description: t("literals.theUserSRoleHasBeenChangedSuccessfully"),
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : t("literals.pleaseTryAgainLater");
      toast({
        title: t("literals.unableToUpdateRole"),
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
            ? t("literals.userDeactivated")
            : t("literals.userReactivated"),
        description:
          variables.status === "inactive"
            ? t("literals.theyWillNoLongerAppearInActiveScheduling")
            : t("literals.theyAreNowAvailableForActiveSchedulesAnd"),
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : t("literals.pleaseTryAgainLater");
      toast({
        title: t("literals.unableToUpdateStatus"),
        description,
        variant: "destructive",
      });
    },
  });

  return {
    updateRoleMutation,
    deactivateMutation,
    resetPassword,
  };
}
