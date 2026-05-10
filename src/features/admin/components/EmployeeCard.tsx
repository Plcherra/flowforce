/**
 * Employee card component
 */

import { useNavigate } from "@/lib/router-adapter";
import {
  MoreVertical,
  KeyRound,
  UserCheck,
  UserX,
  ArrowRight,
  Building2,
  Shield,
  BadgeCheck,
  Sparkles,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";
import { buildInitials, formatRoleLabel } from "@/shared/utils";

interface EmployeeCardProps {
  employee: Employee;
  roleOptions: string[];
  onRoleChange: (userId: string, newRole: string, currentRole: string) => void;
  onStatusToggle: (employee: Employee) => void;
  onResetPassword: (email: string) => void;
  onNavigateToEmployee: (employeeId: string) => void;
  onNavigateToPerformance: (employeeId: string) => void;
}

export function EmployeeCard({
  employee,
  roleOptions,
  onRoleChange,
  onStatusToggle,
  onResetPassword,
  onNavigateToEmployee,
  onNavigateToPerformance,
}: EmployeeCardProps) {
  const navigate = useNavigate();
  const reliability = employee.reliability ?? undefined;
  const reliabilityLabel =
    reliability === undefined ? "N/A" : `${Math.round(reliability)}%`;
  const statusLabel =
    employee.employment_status === "active" ? "Active" : "Inactive";
  const showReactivate = employee.employment_status === "inactive";
  const badgeCount = employee.badges?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={employee.avatar_url ?? undefined}
              alt={`${employee.first_name} ${employee.last_name}`}
            />
            <AvatarFallback>
              {buildInitials(employee.first_name, employee.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {employee.first_name} {employee.last_name}
              </h3>
              <Badge
                style={{
                  backgroundColor: employee.department?.color
                    ? `${employee.department.color}20`
                    : undefined,
                  color: employee.department?.color ?? undefined,
                }}
              >
                {formatRoleLabel(employee.role)}
              </Badge>
              <Badge
                variant={showReactivate ? "outline" : "secondary"}
                className={cn(
                  "capitalize",
                  showReactivate && "border-dashed text-muted-foreground",
                )}
              >
                {statusLabel}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {employee.email}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <Building2 className="mr-1 inline h-3 w-3" />
                {employee.department?.name ?? "Unassigned department"}
              </span>
              {employee.position?.name && (
                <span>
                  <Shield className="mr-1 inline h-3 w-3" />
                  {employee.position.name}
                </span>
              )}
              <span>
                <BadgeCheck className="mr-1 inline h-3 w-3" />
                {badgeCount} badge{badgeCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onResetPassword(employee.email)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Send reset email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusToggle(employee)}>
              {showReactivate ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivate
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigateToEmployee(employee.id)}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Open in directory
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Reliability</span>
            <span>{reliabilityLabel}</span>
          </div>
          <Progress value={reliability ?? 0} className="h-2" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border border-dashed border-border p-2">
            <div className="font-medium text-foreground">
              {employee.skillLevel ?? "—"}
            </div>
            <div className="text-[11px] uppercase tracking-wide">
              Skill level
            </div>
          </div>
          <div className="rounded-md border border-dashed border-border p-2">
            <div className="font-medium text-foreground">
              {employee.noShowCount ?? 0} NS / {employee.lateCount ?? 0} late
            </div>
            <div className="text-[11px] uppercase tracking-wide">
              Attendance (30d)
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={employee.role}
          onValueChange={(value) =>
            onRoleChange(employee.id, value, employee.role)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Update role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {formatRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateToPerformance(employee.id)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Performance
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/enhanced-scheduling?focus=${employee.id}`)}
        >
          <Clock className="mr-2 h-4 w-4" />
          Scheduling
        </Button>
      </div>
    </div>
  );
}
