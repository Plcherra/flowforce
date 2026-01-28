/**
 * Utility functions for department operations
 */

import type { Department } from "../types/directory";

/**
 * Create a map of department IDs to names
 */
export function createDepartmentNameMap(
  departments: Department[],
): Map<string, string> {
  const map = new Map<string, string>();
  departments.forEach((dept) => {
    map.set(dept.id, dept.name);
  });
  return map;
}

/**
 * Get department name by ID
 */
export function getDepartmentName(
  departmentId: string | null,
  directName?: string | null,
  departmentMap?: Map<string, string>,
): string {
  if (directName) return directName;
  if (!departmentId) return "Unassigned";
  return departmentMap?.get(departmentId) ?? "Unknown Department";
}
