/**
 * Utility functions for permission management
 */

import { PERMISSION_KEYS } from "@/hooks/useUserPermissions";
import type { RoleKey, ModuleId } from "../types/permissions";
import { ROLE_MODULES } from "../constants/modules";
import { ROLE_ORDER } from "../constants/roles";
import { normalizeProductRoleKey } from "../constants/productRoles";

export const ALL_TRUE_PERMISSIONS = PERMISSION_KEYS.reduce<
  Record<string, boolean>
>((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

/**
 * Get module defaults for a role
 */
export function getModuleDefaults(role: RoleKey): Record<ModuleId, boolean> {
  return ROLE_MODULES.reduce(
    (moduleAcc, module) => {
      moduleAcc[module.id] = module.defaults[role];
      return moduleAcc;
    },
    {} as Record<ModuleId, boolean>,
  );
}

/**
 * Create default permission matrix
 */
export function createDefaultMatrix(): Record<
  RoleKey,
  Record<ModuleId, boolean>
> {
  const order: RoleKey[] = ROLE_ORDER;
  return order.reduce(
    (acc, role) => {
      acc[role] = getModuleDefaults(role);
      return acc;
    },
    {} as Record<RoleKey, Record<ModuleId, boolean>>,
  );
}

/**
 * Normalize role name to RoleKey
 */
export function normalizeRoleName(name?: string | null): RoleKey | undefined {
  return normalizeProductRoleKey(name);
}

/**
 * Format permission label for display
 */
export function formatPermissionLabel(key: string): string {
  return key
    .replace(/\./g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (str) => str.toUpperCase());
}
