import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { logger } from "@/utils/logger";
import {
  canDeactivateClass,
  clampPermissionsToProductLevel,
  inferProductLevel,
  isCloneableProductLevel,
  isOwnerClass,
  resolveProductLevel,
  type ProductLevel,
} from "@/features/roles/constants/productLevels";
import { allowKeysToClearOnClassSave } from "@/features/roles/constants/personAccessDiffs";

export interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  product_level: ProductLevel;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  is_active: boolean;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  product_level: ProductLevel;
  permissions: Record<string, boolean>;
}

export interface CompanyRolesError {
  message: string;
  code?: string;
  status?: number;
}

export interface UseCompanyRolesOptions {
  onboarding?: boolean;
}

const MINIMAL_ONBOARDING_ROLES: CompanyRole[] = [
  {
    id: "onboarding-basic",
    name: "Onboarding Staff",
    description: "Temporary access during onboarding setup",
    color: "#6b7280",
    icon: "Users",
    hierarchy_level: 1,
    product_level: "staff",
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewOwnSchedules: true,
    },
    is_system_role: true,
    is_active: true,
  },
];

const UNKNOWN_ERROR_MESSAGE = "Unable to load company roles";

const normalizeError = (error: unknown): CompanyRolesError => {
  if (error && typeof error === "object") {
    const err = error as { message?: string; code?: string; status?: number };
    return {
      message:
        typeof err.message === "string" && err.message.length > 0
          ? err.message
          : UNKNOWN_ERROR_MESSAGE,
      code: typeof err.code === "string" ? err.code : undefined,
      status: typeof err.status === "number" ? err.status : undefined,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: UNKNOWN_ERROR_MESSAGE };
};

const isMissingCompanyError = (error: CompanyRolesError) => {
  if (error.code === "PGRST116") {
    return true;
  }

  const lowerMessage = error.message.toLowerCase();
  return lowerMessage.includes("company");
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ? error.message
      : fallback;

export function useCompanyRoles(options: UseCompanyRolesOptions = {}) {
  const { onboarding = false } = options;
  const { user } = useAuth();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CompanyRolesError | null>(null);
  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const metadataCompanyId =
        typeof user.user_metadata?.active_company_id === "string"
          ? (user.user_metadata.active_company_id as string)
          : typeof user.user_metadata?.company_id === "string"
            ? (user.user_metadata.company_id as string)
            : null;

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();

      if (currentProfileError) {
        logger.error("Error resolving current profile for company roles", {
          error: currentProfileError,
          tags: ["error"],
        });
      }

      const companyId = currentProfile?.company_id ?? metadataCompanyId;

      if (!companyId) {
        throw new Error("No company context available for role listing");
      }

      const { data, error: rpcError } = await supabase.rpc(
        "get_company_roles",
        {
          company_uuid: companyId,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      const parsedRoles = (data || []).map((role: any) => {
        const productLevel = resolveProductLevel({
          product_level: role.product_level,
          name: role.name,
          hierarchy_level: role.hierarchy_level,
        });
        const permissions =
          typeof role.permissions === "string"
            ? JSON.parse(role.permissions)
            : role.permissions || {};

        return {
          ...role,
          product_level: productLevel,
          permissions: clampPermissionsToProductLevel(productLevel, permissions),
        };
      });

      setRoles(parsedRoles);
    } catch (err: unknown) {
      logger.error("Error fetching company roles", {
        error: err,
        tags: ["error"],
      });
      const normalizedError = normalizeError(err);
      setError(normalizedError);

      if (onboarding && isMissingCompanyError(normalizedError)) {
        setRoles([...MINIMAL_ONBOARDING_ROLES]);
      } else {
        setRoles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, onboarding]);

  useEffect(() => {
    if (user) {
      fetchRoles().catch((err) => {
        logger.error("Unhandled error while fetching company roles", {
          error: err,
          tags: ["error"],
        });
      });
    } else {
      setRoles([]);
      setError(null);
      setLoading(false);
    }
  }, [user, fetchRoles]);

  const createRole = useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      if (!user) throw new Error("User not authenticated");

      // Creating role...

      // Get the user's company_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        logger.error("Error fetching user profile", {
          error: profileError,
          tags: ["error"],
        });
        throw profileError;
      }

      if (!profile?.company_id) {
        throw new Error("No company found for user");
      }

      const productLevel = isCloneableProductLevel(roleData.product_level)
        ? roleData.product_level
        : inferProductLevel(roleData.name, roleData.hierarchy_level);

      if (productLevel === "owner" || isOwnerClass(roleData)) {
        throw new Error("Owner class cannot be created from the class editor");
      }

      const { data, error } = await supabase
        .from("company_roles")
        .insert({
          ...roleData,
          product_level: productLevel,
          company_id: profile.company_id,
          permissions: clampPermissionsToProductLevel(
            productLevel,
            roleData.permissions,
          ),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating role", { error, tags: ["error"] });
        throw error;
      }

      // Role created successfully
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      fetchRoles();
    },
    onError: (error: unknown) => {
      logger.error("Create role mutation error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create role"),
        variant: "destructive",
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CompanyRole> & { id: string }) => {
      // Updating role...

      const current = roles.find((role) => role.id === id);
      const productLevel = resolveProductLevel({
        product_level: current?.product_level ?? updates.product_level,
        name: updates.name ?? current?.name,
        hierarchy_level: updates.hierarchy_level ?? current?.hierarchy_level,
      });
      const { product_level: _lockedLevel, ...safeUpdates } = updates;
      const nextPermissions = updates.permissions
        ? clampPermissionsToProductLevel(productLevel, updates.permissions)
        : undefined;

      const { data, error } = await supabase
        .from("company_roles")
        .update({
          ...safeUpdates,
          permissions: nextPermissions,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating role", { error, tags: ["error"] });
        throw error;
      }

      if (nextPermissions && current?.permissions) {
        const keysToClear = allowKeysToClearOnClassSave(
          current.permissions,
          nextPermissions,
        );
        if (keysToClear.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id")
            .eq("id", user?.id ?? "")
            .maybeSingle();
          if (profile?.company_id) {
            const { data: members } = await supabase
              .from("profiles")
              .select("id")
              .eq("company_id", profile.company_id)
              .eq("role_id", id);
            const memberIds = (members ?? [])
              .map((member) => member.id)
              .filter(Boolean);
            if (memberIds.length > 0) {
              await supabase
                .from("user_permissions")
                .delete()
                .in("user_id", memberIds)
                .in("permission_key", keysToClear)
                .eq("permission_value", "allow");
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      fetchRoles();
    },
    onError: (error: unknown) => {
      logger.error("Update role mutation error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update role"),
        variant: "destructive",
      });
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const current = roles.find((role) => role.id === roleId);
      if (current && !canDeactivateClass(current)) {
        throw new Error("Owner class cannot be deactivated");
      }

      const { error } = await supabase
        .from("company_roles")
        .update({ is_active: false })
        .eq("id", roleId);

      if (error) {
        logger.error("Error deactivating role", { error, tags: ["error"] });
        throw error;
      }

      // Role deactivated successfully
    },
    onSuccess: () => {
      toast({
        title: "Class archived",
        description: "It is hidden from invite and the Roles list.",
      });
      fetchRoles();
    },
    onError: (error: unknown) => {
      logger.error("Delete role mutation error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to archive class"),
        variant: "destructive",
      });
    },
  });

  const restoreRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("company_roles")
        .update({ is_active: true })
        .eq("id", roleId);

      if (error) {
        logger.error("Error restoring role", { error, tags: ["error"] });
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Class restored",
        description: "It is available for invite and Roles again.",
      });
      fetchRoles();
    },
    onError: (error: unknown) => {
      logger.error("Restore role mutation error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to restore class"),
        variant: "destructive",
      });
    },
  });

  return {
    roles,
    loading,
    isLoading: loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    restoreRole,
    refetchRoles: fetchRoles,
  };
}
