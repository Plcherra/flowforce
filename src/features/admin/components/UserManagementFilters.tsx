/**
 * User management filters component
 */

import { Search, Filter, Shield, Building2, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ViewMode, StatusFilter } from "../types/userManagement";
import { formatRoleLabel } from "@/shared/utils";

interface UserManagementFiltersProps {
  searchTerm: string;
  statusFilter: StatusFilter;
  roleFilter: string;
  departmentFilter: string;
  viewMode: ViewMode;
  roleOptions: string[];
  departments: Array<{ id: string; name: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onRoleChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function UserManagementFilters({
  searchTerm,
  statusFilter,
  roleFilter,
  departmentFilter,
  viewMode,
  roleOptions,
  departments,
  onSearchChange,
  onStatusChange,
  onRoleChange,
  onDepartmentChange,
  onViewModeChange,
}: UserManagementFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department, or position"
            className="pl-9"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={roleFilter} onValueChange={onRoleChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Shield className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {formatRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Building2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border border-border p-1">
          <Button
            variant={viewMode === "department" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => onViewModeChange("department")}
          >
            <LayoutGrid className="h-4 w-4" />
            Department
          </Button>
          <Button
            variant={viewMode === "role" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => onViewModeChange("role")}
          >
            <Shield className="h-4 w-4" />
            Role
          </Button>
        </div>
      </div>
    </div>
  );
}
