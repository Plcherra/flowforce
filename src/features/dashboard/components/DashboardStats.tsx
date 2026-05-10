import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  CheckSquare,
  Building2,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardStatsProps {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    todaysShifts: number;
    pendingTimeOff: number;
    approvedTimeOffUpcoming: number;
    timeOffDaysUsed: number;
    timeOffBalanceRemaining: number;
  };
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const DashboardStats = React.memo(function DashboardStats({
  stats,
  loading,
  error,
  onRetry,
}: DashboardStatsProps) {
  const { t } = useTranslation();
  const statCards = useMemo(
    () => [
      {
        key: "totalEmployees",
        title: t("dashboard.stats.totalEmployees"),
        icon: Users,
        value: stats.totalEmployees,
        subValue: `${stats.activeEmployees} ${t("dashboard.stats.activeEmployees")}`,
      },
      {
        key: "departments",
        title: t("dashboard.stats.departments"),
        icon: Building2,
        value: stats.totalDepartments,
        subValue: t("dashboard.stats.activeDepartments"),
      },
      {
        key: "todaysShifts",
        title: t("dashboard.stats.todaysShifts"),
        icon: Calendar,
        value: stats.todaysShifts,
        subValue: t("dashboard.stats.scheduledToday"),
      },
      {
        key: "pendingRequests",
        title: t("dashboard.stats.pendingRequests"),
        icon: CheckSquare,
        value: stats.pendingTimeOff,
        subValue: t("dashboard.stats.timeOffRequestsDetail", {
          approved: stats.approvedTimeOffUpcoming,
          used: stats.timeOffDaysUsed,
        }),
      },
      {
        key: "timeOffBalance",
        title: t("dashboard.stats.timeOffBalance"),
        icon: CalendarCheck,
        value: stats.timeOffBalanceRemaining,
        subValue: t("dashboard.stats.timeOffBalanceHint", {
          used: stats.timeOffDaysUsed,
        }),
      },
    ],
    [stats, t],
  );

  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="flex-1 space-y-1">
            <AlertTitle>Failed to load statistics</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">{error}</span>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ key, title, icon: Icon, value, subValue }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  formatNumber(value)
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {loading ? <Skeleton className="h-3 w-24" /> : subValue}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default DashboardStats;
