import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router-adapter";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/hooks/useDashboardData";
import {
  type OperatorCommandCenterData,
  useOperatorCommandCenterData,
} from "@/features/dashboard/hooks/useOperatorCommandCenterData";
import { cn } from "@/lib/utils";

type Severity = "good" | "watch" | "urgent";

type OperatorCard = {
  label: string;
  value: string;
  detail: string;
  icon: typeof CalendarClock;
  severity: Severity;
  href: string;
  action: string;
};

type ManagerAction = {
  label: string;
  detail: string;
  href: string;
  severity: Severity;
};

interface OperatorCommandCenterProps {
  stats: DashboardStats;
  statsLoading?: boolean;
  statsError?: string | null;
  onRetry?: () => void;
}

const severityStyles: Record<
  Severity,
  { card: string; icon: string; badge: string }
> = {
  good: {
    card: "border-success/30 bg-success-muted",
    icon: "bg-success/15 text-success",
    badge: "border-success/30 bg-success-muted text-success",
  },
  watch: {
    card: "border-warning/30 bg-warning-muted",
    icon: "bg-warning/15 text-warning",
    badge: "border-warning/30 bg-warning-muted text-warning-foreground",
  },
  urgent: {
    card: "border-destructive/30 bg-destructive/10",
    icon: "bg-destructive/15 text-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatHours(value: number) {
  return `${numberFormatter.format(value)}h`;
}

function getCoverageSeverity(stats: DashboardStats): Severity {
  if (stats.coverageCompleteness < 70) return "urgent";
  if (stats.coverageCompleteness < 90) return "watch";
  return "good";
}

function getTaskSeverity(data: OperatorCommandCenterData): Severity {
  if (data.overdueTasks > 0 || data.highPriorityTasks > 0) return "urgent";
  if (data.openTasks > 0) return "watch";
  return "good";
}

function getInventorySeverity(data: OperatorCommandCenterData): Severity {
  if (
    data.lowStockItems > 5 ||
    data.shortageSignalsToday > 5 ||
    data.overduePurchases > 0
  ) {
    return "urgent";
  }
  if (
    data.lowStockItems > 0 ||
    data.shortageSignalsToday > 0 ||
    data.openPurchases > 0
  ) {
    return "watch";
  }
  return "good";
}

function getLaborSeverity(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
): Severity {
  if (data.unassignedShiftsToday > 0 || data.draftShiftsToday > 0) {
    return "urgent";
  }
  if (data.overstaffedShiftsToday > 0 || data.understaffedShiftsToday > 0) {
    return "watch";
  }
  if (stats.hoursUtilization > 95 || stats.hoursUtilization < 55) {
    return "watch";
  }
  return "good";
}

function buildCards(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
  t: (key: string, options?: Record<string, string | number>) => string,
): OperatorCard[] {
  return [
    {
      label: t("dashboard.scheduleCoverage"),
      value: `${stats.coverageCompleteness}%`,
      detail: t("dashboard.shiftsTodayUnassigned", {
        shifts: stats.todaysShifts,
        unassigned: data.unassignedShiftsToday,
      }),
      icon: CalendarClock,
      severity: getCoverageSeverity(stats),
      href: "/app/enhanced-scheduling",
      action: t("dashboard.reviewSchedule"),
    },
    {
      label: t("dashboard.laborPlan"),
      value: formatHours(data.laborHoursToday),
      detail: t("dashboard.scheduledLaborDetail", {
        labor: currencyFormatter.format(data.laborCostToday),
        overstaffed: data.overstaffedShiftsToday,
      }),
      icon: Clock3,
      severity: getLaborSeverity(stats, data),
      href: "/app/enhanced-scheduling",
      action: t("dashboard.tuneLabor"),
    },
    {
      label: t("dashboard.taskExecution"),
      value: `${stats.taskCompletion}%`,
      detail: t("dashboard.taskExecutionDetail", {
        open: data.openTasks,
        overdue: data.overdueTasks,
        highPriority: data.highPriorityTasks,
      }),
      icon: ClipboardCheck,
      severity: getTaskSeverity(data),
      href: "/app/tasks",
      action: t("dashboard.openTasks"),
    },
    {
      label: t("dashboard.inventoryPosture"),
      value: String(data.shortageSignalsToday || data.lowStockItems),
      detail: t("dashboard.inventoryPostureDetail", {
        active: data.activeInventoryItems,
        purchases: data.openPurchases,
      }),
      icon: Boxes,
      severity: getInventorySeverity(data),
      href: "/app/inventory",
      action: t("dashboard.checkStock"),
    },
    {
      label: t("dashboard.managerRisk"),
      value: String(
        stats.pendingTimeOff +
          data.unassignedShiftsToday +
          data.overdueTasks +
          Math.max(data.shortageSignalsToday, data.lowStockItems) +
          data.overduePurchases,
      ),
      detail: t("dashboard.managerRiskDetail", {
        requests: stats.pendingTimeOff,
        shortages: data.shortageSignalsToday,
      }),
      icon: ShieldAlert,
      severity:
        stats.pendingTimeOff +
          data.unassignedShiftsToday +
          data.overdueTasks +
          Math.max(data.shortageSignalsToday, data.lowStockItems) +
          data.overduePurchases >
        0
          ? "urgent"
          : "good",
      href: "/app/reports",
      action: t("dashboard.reviewRisk"),
    },
  ];
}

function buildManagerActions(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
  t: (key: string, options?: Record<string, string | number>) => string,
): ManagerAction[] {
  const actions: ManagerAction[] = [];

  if (data.unassignedShiftsToday > 0 || data.draftShiftsToday > 0) {
    actions.push({
      label: t("dashboard.finalizeTodaySSchedule"),
      detail: t("dashboard.finalizeScheduleDetail", {
        unassigned: data.unassignedShiftsToday,
        drafts: data.draftShiftsToday,
      }),
      href: "/app/enhanced-scheduling",
      severity: "urgent",
    });
  }

  if (stats.pendingTimeOff > 0) {
    actions.push({
      label: t("dashboard.reviewTimeOffQueue"),
      detail: t("dashboard.timeOffQueueDetail", {
        count: stats.pendingTimeOff,
      }),
      href: "/app/enhanced-scheduling?panel=timeoff",
      severity: "watch",
    });
  }

  if (data.overdueTasks > 0 || data.highPriorityTasks > 0) {
    actions.push({
      label: t("dashboard.clearTaskBlockers"),
      detail: t("dashboard.taskBlockersDetail", {
        overdue: data.overdueTasks,
        highPriority: data.highPriorityTasks,
      }),
      href: "/app/tasks",
      severity: "urgent",
    });
  }

  if (data.lowStockItems > 0) {
    actions.push({
      label: t("dashboard.reorderLowStockItems"),
      detail: t("dashboard.lowStockDetail", {
        count: data.shortageSignalsToday || data.lowStockItems,
      }),
      href: "/app/inventory",
      severity: data.lowStockItems > 5 ? "urgent" : "watch",
    });
  }

  if (data.openPurchases > 0) {
    actions.push({
      label: t("dashboard.trackPurchasing"),
      detail: t("dashboard.openPurchasesDetail", {
        count: data.openPurchases,
        value: currencyFormatter.format(data.openPurchaseValue),
      }),
      href: "/app/inventory/purchasing",
      severity: data.overduePurchases > 0 ? "urgent" : "watch",
    });
  }

  if (data.overstaffedShiftsToday > 0) {
    actions.push({
      label: t("dashboard.trimOverstaffedShifts"),
      detail: t("dashboard.overstaffedDetail", {
        count: data.overstaffedShiftsToday,
      }),
      href: "/app/enhanced-scheduling",
      severity: "watch",
    });
  }

  if (actions.length > 0) return actions.slice(0, 5);

  return [
    {
      label: t("dashboard.walkTheFloorPlan"),
      detail: t("dashboard.scheduleLaborTaskAndInventorySignalsAreSteadyForToday"),
      href: "/app/enhanced-scheduling",
      severity: "good",
    },
    {
      label: t("dashboard.reviewReports"),
      detail: t("dashboard.useTheReportingViewToSpotTrendsBeforeTheyBecomeIssues"),
      href: "/app/reports",
      severity: "good",
    },
  ];
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <Skeleton className="mb-4 h-9 w-9 rounded-md" />
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-2 h-8 w-20" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export default function OperatorCommandCenter({
  stats,
  statsLoading = false,
  statsError,
  onRetry,
}: OperatorCommandCenterProps) {
  const { t } = useTranslation();
  const severityLabel: Record<Severity, string> = {
    good: t("dashboard.steady"),
    watch: t("dashboard.watch"),
    urgent: t("dashboard.urgent"),
  };
  const {
    data,
    loading: commandLoading,
    error: commandError,
    refetch,
  } = useOperatorCommandCenterData();
  const loading = statsLoading || commandLoading;
  const cards = buildCards(stats, data, t);
  const actions = buildManagerActions(stats, data, t);
  const urgentCount = cards.filter((card) => card.severity === "urgent").length;
  const watchCount = cards.filter((card) => card.severity === "watch").length;
  const error = statsError ?? commandError;

  const handleRetry = () => {
    onRetry?.();
    void refetch();
  };

  return (
    <section className="space-y-4" aria-label={t("dashboard.operatorCommandCenter")}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1 space-y-2">
            <AlertTitle>{t("dashboard.commandCenterDataNeedsAttention")}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={loading}
              >
                {t("dashboard.retry")}</Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader className="gap-3 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-xl">{t("dashboard.todaySCommandCenter")}</CardTitle>
            <CardDescription>
              {t("dashboard.laborInventoryTaskScheduleAndRiskSignalsForTheActiveTenant")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "h-7 px-3",
                urgentCount > 0
                  ? severityStyles.urgent.badge
                  : severityStyles.good.badge,
              )}
            >
              {t("dashboard.urgentCount", { count: urgentCount })}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-7 px-3",
                watchCount > 0
                  ? severityStyles.watch.badge
                  : severityStyles.good.badge,
              )}
            >
              {t("dashboard.watchCount", { count: watchCount })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <CardSkeleton key={index} />
                ))
              : cards.map((card) => {
                  const Icon = card.icon;
                  const styles = severityStyles[card.severity];
                  return (
                    <Link
                      key={card.label}
                      to={card.href}
                      className={cn(
                        "group rounded-lg border p-4 transition hover:border-primary/45 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
                        styles.card,
                      )}
                    >
                      <div
                        className={cn(
                          "mb-4 flex h-9 w-9 items-center justify-center rounded-md",
                          styles.icon,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-muted-foreground">
                            {card.label}
                          </div>
                          <div className="mt-1 text-2xl font-semibold tracking-normal text-foreground">
                            {card.value}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0", styles.badge)}
                        >
                          {severityLabel[card.severity]}
                        </Badge>
                      </div>
                      <p className="mt-3 min-h-10 text-sm leading-snug text-muted-foreground">
                        {card.detail}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {card.action}
                        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </Link>
                  );
                })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    {t("dashboard.managerActionQueue")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.rankedByWhatCanDisruptTodaySOperation")}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link to="/app/tasks">
                    {t("dashboard.openWork")}<ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-2">
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-md border p-3"
                      >
                        <Skeleton className="mb-2 h-4 w-40" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  : actions.map((action) => (
                      <Link
                        key={action.label}
                        to={action.href}
                        className="flex items-center justify-between gap-4 rounded-md border p-3 transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{action.label}</div>
                          <div className="mt-1 text-sm leading-snug text-muted-foreground">
                            {action.detail}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0",
                            severityStyles[action.severity].badge,
                          )}
                        >
                          {severityLabel[action.severity]}
                        </Badge>
                      </Link>
                    ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">{t("dashboard.costPulse")}</h2>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-semibold">
                      {currencyFormatter.format(
                        data.totalOperatingCostToday ||
                          data.laborCostToday + data.openPurchaseValue,
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.todaySLaborProductionWastePurchasingAndExpenseCost")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">{t("dashboard.labor")}</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(data.laborCostToday)}
                      </div>
                    </div>
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">{t("common.purchasing")}</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(
                          data.purchasingCostToday || data.openPurchaseValue,
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">{t("dashboard.waste")}</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(data.wasteCostToday)}
                      </div>
                    </div>
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">{t("dashboard.production")}</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(data.productionCostToday)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
