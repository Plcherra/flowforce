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

interface RoleSummarySidebarProps {
  roleSummaries: RoleSummary[];
  positionCoverage: PositionCoverage[];
}

export function RoleSummarySidebar({
  roleSummaries,
  positionCoverage,
}: RoleSummarySidebarProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role &amp; permission snapshot
        </CardTitle>
        <CardDescription>
          Track coverage across roles and ensure permissions reflect your
          operating model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Top roles
          </div>
          {roleSummaries.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No custom roles found yet. Configure roles to unlock tailored
              permissions.
            </div>
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
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Position coverage
          </div>
          {positionCoverage.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Assign positions to understand workload coverage.
            </div>
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
          >
            Manage roles
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/settings?tab=positions")}
          >
            Manage positions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
