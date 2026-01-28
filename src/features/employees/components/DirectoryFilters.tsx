/**
 * Directory filters component
 */

import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department } from "../types/directory";

interface DirectoryFiltersProps {
  searchTerm: string;
  departmentFilter: string;
  departments: Department[];
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  isMobile: boolean;
}

export function DirectoryFilters({
  searchTerm,
  departmentFilter,
  departments,
  onSearchChange,
  onDepartmentChange,
  isMobile,
}: DirectoryFiltersProps) {
  return (
    <div
      className={
        isMobile
          ? "flex flex-col gap-3"
          : "flex items-center justify-between gap-4"
      }
    >
      <div
        className={
          isMobile ? "w-full" : "flex items-center gap-3 flex-1 max-w-md"
        }
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
