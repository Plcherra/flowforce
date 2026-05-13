/**
 * Hook for managing permission matrix state
 */

import { useMemo, useState, useEffect } from "react";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import type { RoleKey, ModuleId, RoleMetadata } from "../types/permissions";
import { ROLE_ORDER } from "../constants/roles";
import {
  getModuleDefaults,
  normalizeRoleName,
  createDefaultMatrix,
} from "../utils/permissionHelpers";
import {
  buildModuleStateFromPermissions,
  applyModulesToPermissions,
} from "../utils/permissionMatrix";
import { ALL_TRUE_PERMISSIONS } from "../utils/permissionHelpers";
import { ROLE_LABELS } from "../constants/roles";

interface UsePermissionMatrixProps {
  roles: CompanyRole[];
  rolesLoading: boolean;
}

export function usePermissionMatrix({
  roles,
  rolesLoading,
}: UsePermissionMatrixProps) {
  const [matrix, setMatrix] = useState<
    Record<RoleKey, Record<ModuleId, boolean>>
  >(() => createDefaultMatrix());
  const [roleMetadata, setRoleMetadata] = useState<
    Record<RoleKey, RoleMetadata>
  >({} as Record<RoleKey, RoleMetadata>);
  const [dirtyRoles, setDirtyRoles] = useState<Set<RoleKey>>(new Set());

  const rolesArray = useMemo(
    () => (Array.isArray(roles) ? roles : []),
    [roles],
  );
  const rolesFingerprint = useMemo(
    () =>
      rolesArray
        .map((role) => `${role.id}:${JSON.stringify(role.permissions)}`)
        .join("|"),
    [rolesArray],
  );

  const initializeFromRoles = (rolesToUse: CompanyRole[]) => {
    const nextMetadata = {} as Record<RoleKey, RoleMetadata>;
    const nextMatrix: Record<
      RoleKey,
      Record<ModuleId, boolean>
    > = createDefaultMatrix();

    ROLE_ORDER.forEach((roleKey) => {
      const existingRole = rolesToUse.find(
        (role) => normalizeRoleName(role.name) === roleKey,
      );
      if (existingRole) {
        const parsedPermissions: Record<string, boolean> =
          typeof existingRole.permissions === "string"
            ? JSON.parse(existingRole.permissions)
            : (existingRole.permissions as Record<string, boolean>) || {};

        nextMetadata[roleKey] = {
          id: existingRole.id,
          name: existingRole.name,
          basePermissions: parsedPermissions,
        };
        nextMatrix[roleKey] =
          buildModuleStateFromPermissions(parsedPermissions);
      } else {
        const defaults = getModuleDefaults(roleKey);
        nextMetadata[roleKey] = {
          name: ROLE_LABELS[roleKey],
          basePermissions:
            roleKey === "owner"
              ? { ...ALL_TRUE_PERMISSIONS }
              : applyModulesToPermissions({}, defaults, roleKey),
          isSystemFallback: true,
        };
        nextMatrix[roleKey] = defaults;
      }
    });

    setRoleMetadata(nextMetadata);
    setMatrix(nextMatrix);
  };

  useEffect(() => {
    if (rolesLoading) return;
    if (dirtyRoles.size > 0) return;
    initializeFromRoles(rolesArray);
  }, [rolesLoading, dirtyRoles.size, rolesArray, rolesFingerprint]);

  const updatedPermissions = useMemo(() => {
    return ROLE_ORDER.reduce<Record<RoleKey, Record<string, boolean>>>(
      (acc, roleKey) => {
        const base = roleMetadata[roleKey]?.basePermissions || {};
        const modules = matrix[roleKey] || getModuleDefaults(roleKey);
        acc[roleKey] = applyModulesToPermissions(base, modules, roleKey);
        return acc;
      },
      {} as Record<RoleKey, Record<string, boolean>>,
    );
  }, [matrix, roleMetadata]);

  const handleModuleToggle = (
    roleKey: RoleKey,
    moduleId: ModuleId,
    value: boolean,
  ) => {
    if (roleKey === "owner") return;
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: {
        ...(prev[roleKey] || getModuleDefaults(roleKey)),
        [moduleId]: value,
      },
    }));
    setDirtyRoles((prev) => {
      const next = new Set(prev);
      next.add(roleKey);
      return next;
    });
  };

  const handleResetRole = (roleKey: RoleKey) => {
    if (roleKey === "owner") return;
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: getModuleDefaults(roleKey),
    }));
    setDirtyRoles((prev) => {
      const next = new Set(prev);
      next.add(roleKey);
      return next;
    });
  };

  const handleResetAll = () => {
    const nextDirty = new Set<RoleKey>();
    ROLE_ORDER.forEach((role) => {
      if (role !== "owner") {
        nextDirty.add(role);
      }
    });
    setMatrix(createDefaultMatrix());
    setDirtyRoles(nextDirty);
  };

  return {
    matrix,
    roleMetadata,
    dirtyRoles,
    updatedPermissions,
    setDirtyRoles,
    handleModuleToggle,
    handleResetRole,
    handleResetAll,
  };
}
