/**
 * Utility functions for role summaries
 */

import type { Employee } from "@/hooks/useEmployees";
import type { RoleSummary } from "../types/userManagement";

/**
 * Calculate role summaries
 */
export function calculateRoleSummaries(
  roles: Array<{
    id: string;
    name: string;
    color: string | null;
    permissions?: Record<string, boolean> | null;
  }>,
  employees: Employee[],
): RoleSummary[] {
  if (!Array.isArray(roles)) return [];

  return roles
    .map((role) => {
      const normalized = role.name.toLowerCase();
      const members = employees.filter(
        (employee) => employee.role?.toLowerCase() === normalized,
      ).length;
      const permissionCount = Object.values(role.permissions ?? {}).filter(
        Boolean,
      ).length;
      return {
        id: role.id,
        name: role.name,
        color: role.color,
        members,
        permissionCount,
      };
    })
    .sort((a, b) => b.members - a.members)
    .slice(0, 4);
}
