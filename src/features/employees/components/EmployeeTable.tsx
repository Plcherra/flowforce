/**
 * Employee table component
 */

import { useTranslation } from "react-i18next";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/hooks/useEmployees";
import { accessLevelKey, directoryMembership } from "../directoryPresence";
import { resendCompanyInvite } from "../utils/resendCompanyInvite";
import { getDepartmentName } from "../utils/departmentHelpers";

interface EmployeeTableProps {
  employees: Employee[];
  departmentMap: Map<string, string>;
  onEmployeeClick: (employee: Employee) => void;
  canResendInvites: boolean;
}

export function EmployeeTable({
  employees,
  departmentMap,
  onEmployeeClick,
  canResendInvites,
}: EmployeeTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [resending, setResending] = useState<string | null>(null);
  const jobTitle = (employee: Employee) =>
    employee.jobRole?.trim() || t("hireActivity.roleUnset");
  const accessLabel = (employee: Employee) => {
    const key = accessLevelKey(employee.role);
    return key ? t(key) : employee.role;
  };
  const statusLabel = (employee: Employee) => {
    const membership = directoryMembership(employee);
    if (membership === "invited") return t("hireActivity.invited");
    if (membership === "active") return t("hireActivity.active");
    return employee.employment_status || t("literals.unknown");
  };
  const resend = async (employee: Employee) => {
    if (!employee.email) return;
    setResending(employee.id);
    const result = await resendCompanyInvite(employee.email);
    setResending(null);
    toast({
      title: result.ok ? t("hireActivity.resendDone") : t("hireActivity.resendFailed"),
      variant: result.ok ? "default" : "destructive",
    });
  };
  const getDisplayName = (employee: Employee) => {
    const fullName =
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim();
    return fullName || employee.email || t("employees.unnamedTeammate");
  };

  const getInitials = (employee: Employee) => {
    const first = employee.first_name?.trim()[0] ?? "";
    const last = employee.last_name?.trim()[0] ?? "";
    return `${first}${last}`.toUpperCase() || t("employees.teammateInitials");
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[42%] md:w-[30%]">{t("schedule.name")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("messages.role")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("messages.department")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("dashboard.profile.hireDate")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("schedule.status")}</TableHead>
            <TableHead className="text-right">{t("inventory.actions")}</TableHead>
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
                    <p className="mt-1 text-xs text-muted-foreground md:hidden" data-testid="directory-mobile-status">
                      {jobTitle(employee)} · {statusLabel(employee)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" data-testid="directory-job-role">
                  {jobTitle(employee)}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("hireActivity.accessLabel")}: {accessLabel(employee)}
                </p>
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
                  : t("employees.hireDateUnset")}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant={directoryMembership(employee) === "active" ? "default" : "secondary"}
                  data-testid="directory-status"
                >
                  {statusLabel(employee)}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {employee.last_sign_in_at
                    ? t("hireActivity.lastSignIn", {
                        when: new Date(employee.last_sign_in_at).toLocaleString(),
                      })
                    : t("hireActivity.noSignIn")}
                </p>
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
                      {t("employees.viewDetails")}
                    </DropdownMenuItem>
                    {directoryMembership(employee) === "invited" && canResendInvites ? (
                      <DropdownMenuItem
                        data-testid="directory-resend"
                        disabled={resending === employee.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void resend(employee);
                        }}
                      >
                        {t("hireActivity.resend")}
                      </DropdownMenuItem>
                    ) : null}
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
