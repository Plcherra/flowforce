import { Link } from "@/lib/router-adapter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  GaugeCircle,
  ArrowUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardStats } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

interface OperationsHealthCardProps {
  className?: string;
  stats: DashboardStats;
  loading?: boolean;
}

const SummarySkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="p-3 border border-border rounded-lg bg-muted/30 space-y-2"
      >
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
);

export function OperationsHealthCard({
  className,
  stats,
  loading,
}: OperationsHealthCardProps) {
  const { t } = useTranslation();

  const summaryItems = [
    {
      icon: GaugeCircle,
      label: t("dashboard.operationsSummary.coverageCompleteness", {
        defaultValue: "Coverage completeness",
      }),
      value: `${stats.coverageCompleteness}%`,
      hint: t("dashboard.operationsSummary.coverageCompletenessHint", {
        defaultValue: "Scheduled coverage vs required shifts this week.",
      }),
      iconClass: "text-primary",
    },
    {
      icon: Clock,
      label: t("dashboard.operationsSummary.hoursUtilisation", {
        defaultValue: "Hours utilisation",
      }),
      value: `${stats.hoursUtilization}%`,
      hint: t("dashboard.operationsSummary.hoursUtilisationHint", {
        defaultValue: "Scheduled hours compared with capacity.",
      }),
      iconClass: "text-secondary",
    },
    {
      icon: CheckCircle,
      label: t("dashboard.operationsSummary.taskCompletion", {
        defaultValue: "Task completion",
      }),
      value: `${stats.taskCompletion}%`,
      hint: t("dashboard.operationsSummary.taskCompletionHint", {
        defaultValue: "Operations tasks completed this week.",
      }),
      iconClass: "text-emerald-500",
    },
    {
      icon: CalendarDays,
      label: t("dashboard.operationsSummary.shiftsToday"),
      value: stats.todaysShifts,
      hint: t("dashboard.operationsSummary.shiftsHint"),
      iconClass: "text-amber-500",
    },
  ];

  const quickLinks = [
    {
      to: "/app/enhanced-scheduling",
      label: t("dashboard.operationsSummary.viewSchedule"),
      description: t("dashboard.operationsSummary.viewScheduleDesc"),
    },
    {
      to: "/app/enhanced-scheduling?panel=timeoff",
      label: t("dashboard.operationsSummary.reviewTimeOff"),
      description: t("dashboard.operationsSummary.reviewTimeOffDesc"),
    },
    {
      to: "/app/employees",
      label: t("dashboard.operationsSummary.managePeople"),
      description: t("dashboard.operationsSummary.managePeopleDesc"),
    },
    {
      to: "/app/tasks",
      label: t("dashboard.operationsSummary.openTasks"),
      description: t("dashboard.operationsSummary.openTasksDesc"),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          {t("dashboard.operationsSummary.title")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.operationsSummary.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <SummarySkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryItems.map(
              ({ icon: Icon, label, value, hint, iconClass }) => (
                <div
                  key={label}
                  className="p-3 border border-border rounded-lg bg-muted/30"
                >
                  <div
                    className={cn(
                      "mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background",
                      iconClass,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {label}
                  </div>
                  <div className="text-xl font-semibold">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {hint}
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">
            {t("dashboard.operationsSummary.quickActions")}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {quickLinks.map((link) => (
              <Button
                key={link.to}
                variant="outline"
                className="justify-between"
                asChild
              >
                <Link to={link.to}>
                  <div className="text-left">
                    <div className="text-sm font-medium">{link.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {link.description}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OperationsHealthCard;
