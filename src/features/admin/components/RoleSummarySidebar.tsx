/**
 * Role summary sidebar component
 */

import { Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "@/lib/router-adapter";
import type { RoleSummary, PositionCoverage } from "../types/userManagement";
import { useTranslation } from "react-i18next";

interface RoleSummarySidebarProps {
  roleSummaries: RoleSummary[];
  positionCoverage: PositionCoverage[];
}

export function RoleSummarySidebar({
  roleSummaries,
  positionCoverage,
}: RoleSummarySidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role &amp; permission snapshot
        </CardTitle>
        <CardDescription>{t("admin.trackCoverageAcrossRolesAndEnsurePermissionsReflect")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">{t("admin.topRoles")}</div>
          {roleSummaries.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("admin.noCustomRolesFoundYetConfigureRolesTo")}</div>
          ) : (
            roleSummaries.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="font-medium text-foreground">{role.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {role.permissionCount} permission
                    {role.permissionCount === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge
                  style={{
                    backgroundColor: `${role.color}20`,
                    color: role.color,
                  }}
                >
                  {role.members} member{role.members === 1 ? "" : "s"}
                </Badge>
              </div>
            ))
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">{t("admin.positionCoverage")}</div>
          {positionCoverage.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("admin.assignPositionsToUnderstandWorkloadCoverage")}</div>
          ) : (
            positionCoverage.map((position) => (
              <div
                key={position.id}
                className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {position.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {position.role}
                  </div>
                </div>
                <Badge>{position.employees} assigned</Badge>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/settings?tab=roles")}
          >{t("admin.manageRoles")}</Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/settings?tab=positions")}
          >{t("admin.managePositions")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
