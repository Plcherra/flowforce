/**
 * Utility functions for grouping employees
 */

import type { Employee } from "@/hooks/useEmployees";
import type { ViewMode, GroupedEmployees } from "../types/userManagement";
import { sortEmployeesByName } from "./userHelpers";

/**
 * Group employees by department or role
 */
export function groupEmployees(
  employees: Employee[],
  viewMode: ViewMode,
): GroupedEmployees {
  const grouped = new Map<string, Employee[]>();

  for (const employee of employees) {
    let groupName: string;

    if (viewMode === "department") {
      groupName = employee.department?.name ?? "Unassigned";
    } else {
      groupName = employee.role
        ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1)
        : "Unassigned";
    }

    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }
    grouped.get(groupName)!.push(employee);
  }

  // Sort employees within each group
  for (const [groupName, members] of grouped.entries()) {
    grouped.set(groupName, members.sort(sortEmployeesByName));
  }

  // Sort groups by name
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
}
