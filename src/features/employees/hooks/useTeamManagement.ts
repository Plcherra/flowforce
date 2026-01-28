import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

export type TeamRole = {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
};

export function useTeamManagement() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rolesQuery = useQuery({
    queryKey: ["team-management-roles", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<TeamRole[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_roles")
        .select("id, name, permissions")
        .eq("company_id", companyId)
        .order("hierarchy_level", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        permissions: normalizePermissions(role.permissions),
      }));
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { data: role, error: roleError } = await supabase
        .from("company_roles")
        .select("id, name")
        .eq("id", roleId)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!role) throw new Error("Selected role is unavailable.");

      const normalizedRole = normalizeRoleName(role.name);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: normalizedRole, role_id: roleId })
        .eq("id", userId);

      if (profileError) throw profileError;

      await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role: normalizedRole },
          { onConflict: "user_id, role" },
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({
        title: "Role updated",
        description: "The teammate now has the selected permissions.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Unable to update role",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async ({
      roleId,
      permissions,
    }: {
      roleId: string;
      permissions: Record<string, boolean>;
    }) => {
      const { error } = await supabase
        .from("company_roles")
        .update({ permissions })
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-management-roles"] });
      toast({
        title: "Permissions updated",
        description: "Role permissions saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Unable to update permissions",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  return {
    roles: rolesQuery.data ?? [],
    isLoading: rolesQuery.isLoading,
    refreshRoles: rolesQuery.refetch,
    assignRole: assignRole.mutateAsync,
    isAssigning: assignRole.isPending,
    updatePermissions: updatePermissions.mutateAsync,
    isUpdatingPermissions: updatePermissions.isPending,
  };
}

function normalizePermissions(raw: unknown): Record<string, boolean> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return normalizePermissions(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, boolean>>((acc, key) => {
      if (typeof key === "string") {
        acc[key] = true;
      }
      return acc;
    }, {});
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, boolean | number | string>)
      .filter(([, value]) => Boolean(value))
      .reduce<Record<string, boolean>>((acc, [key]) => {
        acc[key] = true;
        return acc;
      }, {});
  }
  return {};
}

function normalizeRoleName(roleName: string) {
  const normalized = roleName.toLowerCase();
  if (
    ["admin", "manager", "employee", "staff", "supervisor", "owner"].includes(
      normalized,
    )
  ) {
    return normalized as
      | "admin"
      | "manager"
      | "employee"
      | "staff"
      | "supervisor"
      | "owner";
  }
  return "staff";
}
