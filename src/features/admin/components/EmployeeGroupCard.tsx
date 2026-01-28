/**
 * Employee group card component
 */

import { LayoutGrid } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Employee } from "@/hooks/useEmployees";
import { EmployeeCard } from "./EmployeeCard";

interface EmployeeGroupCardProps {
  groupName: string;
  members: Employee[];
  roleOptions: string[];
  onRoleChange: (userId: string, newRole: string, currentRole: string) => void;
  onStatusToggle: (employee: Employee) => void;
  onResetPassword: (email: string) => void;
  onNavigateToEmployee: (employeeId: string) => void;
  onNavigateToPerformance: (employeeId: string) => void;
}

export function EmployeeGroupCard({
  groupName,
  members,
  roleOptions,
  onRoleChange,
  onStatusToggle,
  onResetPassword,
  onNavigateToEmployee,
  onNavigateToPerformance,
}: EmployeeGroupCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            {groupName}
          </CardTitle>
          <CardDescription>{members.length} team member(s)</CardDescription>
        </div>
        <Badge variant="outline">{members.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              roleOptions={roleOptions}
              onRoleChange={onRoleChange}
              onStatusToggle={onStatusToggle}
              onResetPassword={onResetPassword}
              onNavigateToEmployee={onNavigateToEmployee}
              onNavigateToPerformance={onNavigateToPerformance}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
