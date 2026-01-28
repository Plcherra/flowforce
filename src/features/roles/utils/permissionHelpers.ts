/**
 * Utility functions for permission management
 */

import { PERMISSION_KEYS } from "@/hooks/useUserPermissions";
import type { RoleKey, ModuleId } from "../types/permissions";
import { ROLE_MODULES } from "../constants/modules";

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
  const { ROLE_ORDER } = require("../constants/roles");
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
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.includes("owner")) return "owner";
  if (lower.includes("admin")) return "admin";
  if (lower.includes("manager")) return "manager";
  if (lower.includes("supervisor")) return "supervisor";
  if (lower.includes("staff") || lower.includes("employee")) return "staff";
  return undefined;
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
