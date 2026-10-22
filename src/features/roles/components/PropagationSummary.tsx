/**
 * Propagation summary component
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RoleKey } from "../types/permissions";
import type { Position } from "@/hooks/usePositions";
import { ROLE_LABELS } from "../constants/roles";
import { useTranslation } from "react-i18next";

interface PropagationSummaryProps {
  selectedRole: RoleKey;
  positions: Position[];
  employees: string[];
  dirtySelectedRole: boolean;
}

export function PropagationSummary({
  selectedRole,
  positions,
  employees,
  dirtySelectedRole,
}: PropagationSummaryProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("roles.propagationSummary")}</CardTitle>
        <CardDescription>
          Automatically syncs with positions and employees assigned to{" "}
          {ROLE_LABELS[selectedRole]}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("roles.positionsImpacted")}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {positions.length}
          </p>
          {positions.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {positions.slice(0, 3).map((position) => (
                <li key={position.id}>{position.name}</li>
              ))}
              {positions.length > 3 && (
                <li>+{positions.length - 3} more positions</li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-dashed p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("roles.employeesAffected")}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {employees.length}
          </p>
          {employees.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {employees.slice(0, 4).map((employee, index) => (
                <li key={`${employee}-${index}`}>{employee}</li>
              ))}
              {employees.length > 4 && (
                <li>+{employees.length - 4} more employees</li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-dashed p-4 bg-muted/40">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("roles.propagationMode")}</p>
          <p className="mt-1 text-sm text-foreground">{t("roles.changesPublishInstantlyThroughPositionManagementSoTeam")}</p>
          {dirtySelectedRole ? (
            <p className="mt-2 text-xs font-medium text-primary">
              Pending save – press &quot;Save Changes&quot; to sync updates.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{t("roles.upToDateLastSyncedWithPositionManagement")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
