/**
 * Hook for managing team directory filters and pagination
 */

import { useMemo } from "react";
import type { Employee } from "@/hooks/useEmployees";
import type { InventorySupplier } from "@/hooks/useInventory";
import type { EmployeesTab } from "../types/directory";
import {
  filterEmployeesBySearch,
  filterEmployeesByTab,
  filterEmployeesByDepartment,
  getEmployeeCounts,
} from "../utils/employeeFilters";
import { filterVendorsBySearch } from "../utils/vendorFilters";
import { paginateItems, calculatePagination } from "../utils/pagination";

interface UseTeamDirectoryFiltersProps {
  employees: Employee[];
  vendors: InventorySupplier[];
  searchTerm: string;
  activeTab: EmployeesTab;
  departmentFilter: string;
  page: number;
  pageSize: number;
}

export function useTeamDirectoryFilters({
  employees,
  vendors,
  searchTerm,
  activeTab,
  departmentFilter,
  page,
  pageSize,
}: UseTeamDirectoryFiltersProps) {
  const filteredEmployees = useMemo(() => {
    let list = filterEmployeesBySearch(employees, searchTerm);
    list = filterEmployeesByTab(list, activeTab);
    list = filterEmployeesByDepartment(list, departmentFilter);
    return list;
  }, [employees, searchTerm, activeTab, departmentFilter]);

  const filteredVendors = useMemo(() => {
    if (activeTab !== "vendors") return [];
    return filterVendorsBySearch(vendors, searchTerm);
  }, [vendors, searchTerm, activeTab]);

  const paginatedEmployees = useMemo(
    () => paginateItems(filteredEmployees, page, pageSize),
    [filteredEmployees, page, pageSize],
  );

  const paginatedVendors = useMemo(
    () => paginateItems(filteredVendors, page, pageSize),
    [filteredVendors, page, pageSize],
  );

  const totalRecords =
    activeTab === "vendors" ? filteredVendors.length : filteredEmployees.length;

  const pagination = useMemo(
    () => calculatePagination(totalRecords, page, pageSize),
    [totalRecords, page, pageSize],
  );

  const employeeCounts = useMemo(
    () => getEmployeeCounts(employees),
    [employees],
  );

  return {
    filteredEmployees,
    filteredVendors,
    paginatedEmployees,
    paginatedVendors,
    pagination,
    employeeCounts,
  };
}
