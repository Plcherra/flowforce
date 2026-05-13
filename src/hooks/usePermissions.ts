import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useCompanyRoles } from "./useCompanyRoles";
import { useUserPermissionOverrides } from "./useUserPermissions";
import type { TeamRole } from "./useTeamManagement";
import {
  createPermissionResolver,
  type PermissionContext,
} from "@/lib/permissions/resolver";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

type Permission =
  | "viewOwnProfile"
  | "viewTeamProfiles"
  | "editOwnProfile"
  | "editTeamProfiles"
  | "viewOwnSchedules"
  | "viewTeamSchedules"
  | "editSchedules"
  | "viewOwnTasks"
  | "viewTeamTasks"
  | "editTasks"
  | "viewOwnExpenses"
  | "viewTeamExpenses"
  | "approveExpenses"
  | "approveTimeOff"
  | "manageUsers"
  | "systemSettings"
  | "createForms"
  | "manageForms"
  | "approveFormSubmissions"
  | "managePositions"
  | "viewAIInsights"
  | "manageInventory"
  | "managePayments";

type UserRole = "staff" | "supervisor" | "manager" | "admin" | "owner";

const defaultPermissionHelpers = {
  can: () => false,
  hasRole: () => false,
  role: undefined as UserRole | undefined,
  positionRole: undefined as UserRole | undefined,
  getDisplayRole: () => "Loading...",
  isLoading: true,
};

export function usePermissions() {
  const { profile, loading: profileLoading } = useProfile();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { data: overrides, isLoading: overridesLoading } =
    useUserPermissionOverrides(profile?.id || null);

  if (profileLoading || rolesLoading || overridesLoading) {
    return defaultPermissionHelpers;
  }

  if (!profile?.role) {
    return {
      ...defaultPermissionHelpers,
      isLoading: false,
      getDisplayRole: () => "Employee",
    };
  }

  const roleHierarchy: Record<UserRole, number> = {
    staff: 1,
    supervisor: 2,
    manager: 3,
    admin: 4,
    owner: 5,
  };

  const profileRole = profile.role as UserRole;
  const positionRole = profile.position?.role as UserRole | undefined;
  const effectiveRole = (positionRole || profileRole) as UserRole;
  const companyRole = Array.isArray(roles)
    ? roles.find(
        (role) => role.name.toLowerCase() === effectiveRole.toLowerCase(),
      )
    : undefined;

  const context: PermissionContext = {
    rolePermissions: companyRole?.permissions || {},
    userOverrides: overrides || [],
    userId: profile.id,
    roleId: companyRole?.id,
  };

  const resolver = createPermissionResolver(context);
  const getCurrentRoleLevel = () => roleHierarchy[effectiveRole] || 0;

  const can = (permission: Permission): boolean => {
    try {
      return resolver.resolve(permission as any);
    } catch (error) {
      logger.error("Failed to resolve permission", { error, tags: ["error"] });
      return false;
    }
  };

  const hasRole = (requiredRole: string | string[]): boolean => {
    if (!profile?.role) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.some((roleKey) => {
        const requiredLevel = roleHierarchy[roleKey as UserRole] || 0;
        return getCurrentRoleLevel() >= requiredLevel;
      });
    }

    const requiredLevel = roleHierarchy[requiredRole as UserRole] || 0;
    return getCurrentRoleLevel() >= requiredLevel;
  };

  const getDisplayRole = (): string => {
    if (profile?.position?.name) {
      return profile.position.name;
    }

    if (companyRole?.name) {
      return companyRole.name;
    }

    return profile.role
      ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
      : "Employee";
  };

  return {
    can,
    hasRole,
    role: profileRole,
    positionRole,
    getDisplayRole,
    isLoading: false,
  };
}

const SUPPORTED_PERMISSION_KEYS = [
  {
    key: "invite_employees",
    label: "Invite Employees",
    description: "Allow this role to send new team invitations.",
  },
  {
    key: "manage_roles",
    label: "Manage Roles",
    description: "Allow this role to assign and update team roles.",
  },
  {
    key: "assign_permissions",
    label: "Assign Permissions",
    description: "Allow this role to modify company permission presets.",
  },
] as const;

type PermissionFlag = (typeof SUPPORTED_PERMISSION_KEYS)[number];
type RolePermissionSet = TeamRole;

export function usePermissionFlags() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rolesQuery = useQuery({
    queryKey: ["permission-flags", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<RolePermissionSet[]> => {
      if (!companyId) return [];

      try {
        const { data, error } = await supabase
          .from("company_roles")
          .select("id, name, permissions")
          .eq("company_id", companyId)
          .order("hierarchy_level", { ascending: true });

        if (error) {
          logger.error("Failed to load permission flags", {
            error,
            tags: ["error"],
          });
          return [];
        }

        return (data ?? []).map((role) => ({
          id: role.id,
          name: role.name,
          permissions: normalizePermissions(role.permissions),
        }));
      } catch (error) {
        logger.error("Unexpected permission flags query error", {
          error,
          tags: ["error"],
        });
        return [];
      }
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({
      roleId,
      key,
      value,
    }: {
      roleId: string;
      key: PermissionFlag["key"];
      value: boolean;
    }) => {
      const rolesData = Array.isArray(rolesQuery.data) ? rolesQuery.data : [];
      const existing = rolesData.find((role) => role.id === roleId);
      const permissions = { ...(existing?.permissions ?? {}) };
      permissions[key] = value;

      const { error } = await supabase
        .from("company_roles")
        .update({ permissions })
        .eq("id", roleId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-flags"] });
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
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      });
    },
  });

  const rolesData = Array.isArray(rolesQuery.data) ? rolesQuery.data : [];
  const roleOptions = rolesData.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions,
  }));

  return {
    roles: roleOptions,
    isLoading: rolesQuery.isLoading,
    featureKeys: SUPPORTED_PERMISSION_KEYS,
    updateFlag: updateFlagMutation.mutateAsync,
    isUpdating: updateFlagMutation.isPending,
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
