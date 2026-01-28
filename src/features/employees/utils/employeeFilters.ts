/**
 * Utility functions for filtering employees
 */

import type { Employee } from "@/hooks/useEmployees";
import type { EmployeesTab } from "../types/directory";

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
    const fullName = `${employee.first_name ?? ""} ${employee.last_name ?? ""}`
      .trim()
      .toLowerCase();
    const email = employee.email?.toLowerCase() ?? "";
    const employeeId = employee.employee_id?.toLowerCase() ?? "";

    return (
      fullName.includes(term) ||
      email.includes(term) ||
      employeeId.includes(term)
    );
  });
}

/**
 * Filter employees by tab type
 */
export function filterEmployeesByTab(
  employees: Employee[],
  tab: EmployeesTab,
): Employee[] {
  if (tab === "managers") {
    return employees.filter((employee) => {
      const role = employee.role?.toLowerCase() ?? "";
      return role === "manager" || role === "admin";
    });
  }
  if (tab === "inactive") {
    return employees.filter(
      (employee) =>
        (employee.employment_status ?? "").toLowerCase() !== "active",
    );
  }
  return employees;
}

/**
 * Filter employees by department
 */
export function filterEmployeesByDepartment(
  employees: Employee[],
  departmentFilter: string,
): Employee[] {
  if (departmentFilter === "all") return employees;
  return employees.filter(
    (employee) => employee.department_id === departmentFilter,
  );
}

/**
 * Get employee counts by status
 */
export function getEmployeeCounts(employees: Employee[]): {
  active: number;
  inactive: number;
  leaders: number;
} {
  const active = employees.filter(
    (employee) => (employee.employment_status ?? "").toLowerCase() === "active",
  ).length;
  const inactive = employees.filter(
    (employee) => (employee.employment_status ?? "").toLowerCase() !== "active",
  ).length;
  const leaders = employees.filter((employee) => {
    const role = employee.role?.toLowerCase() ?? "";
    return role === "manager" || role === "admin";
  }).length;

  return { active, inactive, leaders };
}
