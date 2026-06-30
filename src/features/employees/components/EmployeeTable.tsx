/**
 * Employee table component
 */

import { Mail, Building2, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/hooks/useEmployees";
import { getDepartmentName } from "../utils/departmentHelpers";

interface EmployeeTableProps {
  employees: Employee[];
  departmentMap: Map<string, string>;
  onEmployeeClick: (employee: Employee) => void;
}

export function EmployeeTable({
  employees,
  departmentMap,
  onEmployeeClick,
}: EmployeeTableProps) {
  const getDisplayName = (employee: Employee) => {
    const fullName =
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim();
    return fullName || employee.email || "Unnamed teammate";
  };

  const getInitials = (employee: Employee) => {
    const first = employee.first_name?.trim()[0] ?? "";
    const last = employee.last_name?.trim()[0] ?? "";
    return `${first}${last}`.toUpperCase() || "TM";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[42%] md:w-[30%]">Name</TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead className="hidden md:table-cell">Hire Date</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow
              key={employee.id}
              className="hover:bg-muted/30 cursor-pointer"
              onClick={() => onEmployeeClick(employee)}
            >
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={employee.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(employee)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {getDisplayName(employee)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell capitalize">
                <Badge variant="outline">
                  {employee.role ?? "Unassigned"}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {getDepartmentName(
                      employee.departmentid ?? null,
                      employee.department?.name ?? null,
                      departmentMap,
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {employee.hire_date
                  ? new Date(employee.hire_date).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant={
                    employee.employment_status === "active"
                      ? "default"
                      : "secondary"
                  }
                >
                  {employee.employment_status}
                  {!employee.employment_status && "Unknown"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmployeeClick(employee);
                      }}
                    >
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
