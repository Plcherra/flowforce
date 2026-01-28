/**
 * CSV export utilities for employees
 */

import type { Employee } from "@/hooks/useEmployees";

/**
 * Export employees to CSV
 */
export function exportEmployeesToCSV(employees: Employee[]): void {
  if (employees.length === 0) return;

  const headers = [
    "Name",
    "Email",
    "Role",
    "Department",
    "Hire Date",
    "Status",
    "Employee ID",
  ];

  const rows = employees.map((employee) => {
    const name =
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim();
    const email = employee.email ?? "";
    const role = employee.role ?? "";
    const department = employee.department?.name ?? "Unassigned";
    const hireDate = employee.hire_date
      ? new Date(employee.hire_date).toLocaleDateString()
      : "";
    const status = employee.employment_status ?? "";
    const employeeId = employee.employee_id ?? "";

    return [name, email, role, department, hireDate, status, employeeId];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employees-export-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
