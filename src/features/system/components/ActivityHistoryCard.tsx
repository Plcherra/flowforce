"use client";

import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  activityActorName,
  describeActivity,
  formatActivityTime,
} from "@/features/system/utils/activityHistory";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { ErrorState } from "./ErrorState";

export function ActivityHistoryCard() {
  const { t } = useTranslation();
  const auditLogs = useAuditLogs();
  const system = useSystemSettingsContext();
  const timeZone =
    system.company?.timezone || system.settings?.localization.timezone || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.recentAuditActivity")}</CardTitle>
        <CardDescription>{t("settings.trackPrivilegedConfigurationChangesAcrossTheTenant")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {auditLogs.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settings.loadingAuditHistory")}
          </div>
        ) : auditLogs.error ? (
          <ErrorState message={(auditLogs.error as Error).message} />
        ) : auditLogs.data && auditLogs.data.length > 0 ? (
          <div className="overflow-x-auto">
          <Table className="min-w-[36rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.action")}</TableHead>
                <TableHead>{t("settings.actor")}</TableHead>
                <TableHead>{t("settings.when")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.data.slice(0, 8).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {describeActivity(t, entry)}
                  </TableCell>
                  <TableCell>
                    {activityActorName(
                      entry.performed_byprofile ?? entry.userprofile,
                      t("literals.unknown"),
                    )}
                  </TableCell>
                  <TableCell>
                    {formatActivityTime(entry.created_at, timeZone)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("settings.noAuditEventsRecorded")}</p>
        )}
      </CardContent>
    </Card>
  );
}
