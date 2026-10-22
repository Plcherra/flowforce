/**
 * User management stats cards component
 */

import { Badge } from "@/components/ui/badge";
import type { DepartmentRecord, CompanyInvite } from "../types/userManagement";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t("dashboard.operationsSummary.activeEmployees")}</span>
          <Badge variant="default">{activeCount}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {activeCount}
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t("admin.inactiveEmployees")}</span>
          <Badge variant="secondary">{inactiveCount}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {inactiveCount}
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t("admin.pendingInvites")}</span>
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
          <span className="text-sm font-medium text-muted-foreground">{t("dashboard.stats.departments")}</span>
          <Badge variant="outline">{departments.length}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {departments.length}
        </p>
      </div>
    </div>
  );
}
