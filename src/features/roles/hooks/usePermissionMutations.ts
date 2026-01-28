/**
 * Hook for permission mutations
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import type { Position } from "@/hooks/usePositions";
import { logger } from "@/utils/logger";
import type { RoleKey, ModuleId, RoleMetadata } from "../types/permissions";
import { ROLE_ORDER } from "../constants/roles";
import { normalizeRoleName } from "../utils/permissionHelpers";
import { applyModulesToPermissions } from "../utils/permissionMatrix";
import { getModuleDefaults } from "../utils/permissionHelpers";

interface UsePermissionMutationsProps {
  updateRole: {
    mutateAsync: (args: {
      id: string;
      permissions: Record<string, boolean>;
    }) => Promise<unknown>;
  };
  updatePosition: (
    id: string,
    updates: { permissions: Record<string, boolean> },
  ) => Promise<unknown>;
  refetchRoles: () => void;
  positions: Position[];
  roleMetadata: Record<RoleKey, RoleMetadata>;
  matrix: Record<RoleKey, Record<ModuleId, boolean>>;
  dirtyRoles: Set<RoleKey>;
  setDirtyRoles: (setter: (prev: Set<RoleKey>) => Set<RoleKey>) => void;
}

export function usePermissionMutations({
  updateRole,
  updatePosition,
  refetchRoles,
  positions,
  roleMetadata,
  matrix,
  dirtyRoles,
  setDirtyRoles,
}: UsePermissionMutationsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (dirtyRoles.size === 0) {
      toast({
        title: "No changes detected",
        description: "Adjust the role matrix before saving.",
      });
      return;
    }

    setSaving(true);
    try {
      for (const roleKey of dirtyRoles) {
        const metadata = roleMetadata[roleKey];
        const modules = matrix[roleKey] || getModuleDefaults(roleKey);
        const permissionsToPersist = applyModulesToPermissions(
          metadata?.basePermissions || {},
          modules,
          roleKey,
        );

        if (
          roleKey !== "owner" &&
          metadata?.id &&
          !metadata.id.startsWith("temp-")
        ) {
          await updateRole.mutateAsync({
            id: metadata.id,
            permissions: permissionsToPersist,
          });
        }

        const impactedPositions = positions.filter(
          (position) => normalizeRoleName(position.role) === roleKey,
        );
        if (impactedPositions.length > 0) {
          await Promise.all(
            impactedPositions.map((position) =>
              updatePosition(position.id, {
                permissions: permissionsToPersist,
              }),
            ),
          );
        }
      }

      await refetchRoles();
      setDirtyRoles(() => new Set());
      toast({
        title: "Permissions updated",
        description:
          "Role access changes propagated to linked positions and employees.",
      });
    } catch (error) {
      logger.error("Failed to save role matrix", { error, tags: ["error"] });
      toast({
        title: "Save failed",
        description: "We could not sync the updated permissions. Please retry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleSave,
  };
}
