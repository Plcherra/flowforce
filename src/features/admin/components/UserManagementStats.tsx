/**
 * User management stats cards component
 */

import { Badge } from "@/components/ui/badge";
import type { DepartmentRecord, CompanyInvite } from "../types/userManagement";

interface UserManagementStatsProps {
  activeCount: number;
  inactiveCount: number;
  pendingInvites: CompanyInvite[];
  departments: DepartmentRecord[];
}

export function UserManagementStats({
  activeCount,
  inactiveCount,
  pendingInvites,
  departments,
}: UserManagementStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Active employees
          </span>
          <Badge variant="default">{activeCount}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {activeCount}
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Inactive employees
          </span>
          <Badge variant="secondary">{inactiveCount}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {inactiveCount}
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Pending invites
          </span>
          <Badge variant={pendingInvites.length > 0 ? "default" : "secondary"}>
            {pendingInvites.length}
          </Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {pendingInvites.length}
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Departments
          </span>
          <Badge variant="outline">{departments.length}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {departments.length}
        </p>
      </div>
    </div>
  );
}
