/**
 * Utility functions for filtering employees
 */

import type { Employee } from "@/hooks/useEmployees";
import type { StatusFilter } from "../types/userManagement";

/**
 * Filter employees by search term
 */
export function filterEmployeesBySearch(
  employees: Employee[],
  searchTerm: string,
): Employee[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return employees;

  return employees.filter((employee) => {
    const fullName =
      `${employee.first_name} ${employee.last_name}`.toLowerCase();
    return (
      fullName.includes(term) ||
      employee.email.toLowerCase().includes(term) ||
      employee.position?.name?.toLowerCase().includes(term) ||
      employee.department?.name?.toLowerCase().includes(term)
    );
  });
}

/**
 * Filter employees by role
 */
export function filterEmployeesByRole(
  employees: Employee[],
  roleFilter: string,
): Employee[] {
  if (roleFilter === "all") return employees;
  return employees.filter(
    (employee) => employee.role?.toLowerCase() === roleFilter.toLowerCase(),
  );
}

/**
 * Filter employees by department
 */
export function filterEmployeesByDepartment(
  employees: Employee[],
  departmentFilter: string,
): Employee[] {
  if (departmentFilter === "all") return employees;
  if (departmentFilter === "unassigned") {
    return employees.filter((employee) => !employee.department_id);
  }
  return employees.filter(
    (employee) => employee.department_id === departmentFilter,
  );
}

/**
 * Get employees based on status filter
 */
export function getEmployeesByStatus(
  activeEmployees: Employee[],
  inactiveEmployees: Employee[],
  statusFilter: StatusFilter,
): Employee[] {
  if (statusFilter === "active") return activeEmployees;
  if (statusFilter === "inactive") return inactiveEmployees;
  return [...activeEmployees, ...inactiveEmployees];
}
