/**
 * Utility functions for generating permission suggestions
 */

import type { RoleKey, ModuleId, Suggestion } from "../types/permissions";
import { ROLE_MODULES } from "../constants/modules";
import { ROLE_ORDER } from "../constants/roles";

interface AssignmentInfo {
  positions: unknown[];
  employees: string[];
}

/**
 * Generate permission suggestions based on role assignments and current matrix
 */
export function generateSuggestions(
  matrix: Record<RoleKey, Record<ModuleId, boolean>>,
  assignmentByRole: Map<RoleKey, AssignmentInfo>,
): Suggestion[] {
  const results: Suggestion[] = [];

  ROLE_ORDER.forEach((roleKey) => {
    const modules = matrix[roleKey];
    if (!modules) return;

    const assignmentInfo = assignmentByRole.get(roleKey);
    const employeeCount = assignmentInfo?.employees.length ?? 0;

    if ((roleKey === "manager" || roleKey === "admin") && !modules.analytics) {
      results.push({
        id: `${roleKey}-enable-analytics`,
        role: roleKey,
        moduleId: "analytics",
        recommendation: true,
        reason:
          "Recent performance reviews depend on analytics visibility. Enabling keeps leadership informed.",
        confidence: 0.82,
        risk: "medium",
      });
    }

    if (roleKey === "manager" && !modules.scheduling && employeeCount > 4) {
      results.push({
        id: `${roleKey}-enable-scheduling`,
        role: roleKey,
        moduleId: "scheduling",
        recommendation: true,
        reason: `Managers oversee ${employeeCount} teammates but cannot adjust schedules. Enable to reduce approval backlog.`,
        confidence: 0.78,
        risk: "medium",
      });
    }

    if ((roleKey === "manager" || roleKey === "staff") && modules.system) {
      results.push({
        id: `${roleKey}-disable-system`,
        role: roleKey,
        moduleId: "system",
        recommendation: false,
        reason:
          "System administration access exposes sensitive settings. Limit to Admin/Owner to lower breach risk.",
        confidence: 0.91,
        risk: "high",
      });
    }

    if (roleKey === "staff" && modules.operations && employeeCount < 3) {
      results.push({
        id: `${roleKey}-disable-operations`,
        role: roleKey,
        moduleId: "operations",
        recommendation: false,
        reason:
          "Only a few staff members are assigned. Offloading inventory access reduces accidental adjustments.",
        confidence: 0.67,
        risk: "medium",
      });
    }
  });

  return results;
}
