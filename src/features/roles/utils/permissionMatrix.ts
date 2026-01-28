/**
 * Utility functions for permission matrix operations
 */

import type { RoleKey, ModuleId } from "../types/permissions";
import { ROLE_MODULES } from "../constants/modules";
import { ALL_TRUE_PERMISSIONS } from "./permissionHelpers";

/**
 * Build module state from permissions
 */
export function buildModuleStateFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): Record<ModuleId, boolean> {
  return ROLE_MODULES.reduce(
    (acc, module) => {
      if (module.permissions.length === 0) {
        acc[module.id] = true;
      } else {
        acc[module.id] = module.permissions.every((key) =>
          Boolean(permissions?.[key]),
        );
      }
      return acc;
    },
    {} as Record<ModuleId, boolean>,
  );
}

/**
 * Apply modules to permissions
 */
export function applyModulesToPermissions(
  base: Record<string, boolean>,
  modules: Record<ModuleId, boolean>,
  role: RoleKey,
): Record<string, boolean> {
  const updated = { ...base };

  ROLE_MODULES.forEach((module) => {
    module.permissions.forEach((permission) => {
      updated[permission] = modules[module.id];
    });
  });

  if (role === "owner") {
    return { ...ALL_TRUE_PERMISSIONS, ...updated };
  }

  return updated;
}
