/**
 * Hook for user management filters and grouping
 */

import { useMemo } from "react";
import type { Employee } from "@/hooks/useEmployees";
import type { ViewMode, StatusFilter } from "../types/userManagement";
import {
  getEmployeesByStatus,
  filterEmployeesBySearch,
  filterEmployeesByRole,
  filterEmployeesByDepartment,
} from "../utils/employeeFilters";
import { groupEmployees } from "../utils/employeeGrouping";

interface UseUserManagementFiltersProps {
  activeEmployees: Employee[];
  inactiveEmployees: Employee[];
  searchTerm: string;
  statusFilter: StatusFilter;
  roleFilter: string;
  departmentFilter: string;
  viewMode: ViewMode;
}

export function useUserManagementFilters({
  activeEmployees,
  inactiveEmployees,
  searchTerm,
  statusFilter,
  roleFilter,
  departmentFilter,
  viewMode,
}: UseUserManagementFiltersProps) {
  const allEmployeesForFilters = useMemo(
    () =>
      getEmployeesByStatus(activeEmployees, inactiveEmployees, statusFilter),
    [activeEmployees, inactiveEmployees, statusFilter],
  );

  const filteredEmployees = useMemo(() => {
    let list = filterEmployeesBySearch(allEmployeesForFilters, searchTerm);
    list = filterEmployeesByRole(list, roleFilter);
    list = filterEmployeesByDepartment(list, departmentFilter);
    return list;
  }, [allEmployeesForFilters, searchTerm, roleFilter, departmentFilter]);

  const groupedEmployees = useMemo(
    () => groupEmployees(filteredEmployees, viewMode),
    [filteredEmployees, viewMode],
  );

  return {
    filteredEmployees,
    groupedEmployees,
  };
}
