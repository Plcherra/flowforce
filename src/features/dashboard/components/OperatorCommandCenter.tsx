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
  { card: string; icon: string; badge: string; label: string }
> = {
  good: {
    card: "border-emerald-200 bg-emerald-50/45",
    icon: "bg-emerald-100 text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Steady",
  },
  watch: {
    card: "border-amber-200 bg-amber-50/55",
    icon: "bg-amber-100 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Watch",
  },
  urgent: {
    card: "border-red-200 bg-red-50/60",
    icon: "bg-red-100 text-red-700",
    badge: "border-red-200 bg-red-50 text-red-700",
    label: "Urgent",
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
  if (data.lowStockItems > 5 || data.overduePurchases > 0) return "urgent";
  if (data.lowStockItems > 0 || data.openPurchases > 0) return "watch";
  return "good";
}

function getLaborSeverity(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
): Severity {
  if (data.unassignedShiftsToday > 0 || data.draftShiftsToday > 0) {
    return "urgent";
  }
  if (stats.hoursUtilization > 95 || stats.hoursUtilization < 55) {
    return "watch";
  }
  return "good";
}

function buildCards(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
): OperatorCard[] {
  return [
    {
      label: "Schedule coverage",
      value: `${stats.coverageCompleteness}%`,
      detail: `${stats.todaysShifts} shifts today, ${data.unassignedShiftsToday} unassigned`,
      icon: CalendarClock,
      severity: getCoverageSeverity(stats),
      href: "/app/enhanced-scheduling",
      action: "Review schedule",
    },
    {
      label: "Labor plan",
      value: formatHours(data.laborHoursToday),
      detail: `${currencyFormatter.format(data.laborCostToday)} scheduled labor, ${data.draftShiftsToday} draft shifts`,
      icon: Clock3,
      severity: getLaborSeverity(stats, data),
      href: "/app/enhanced-scheduling",
      action: "Tune labor",
    },
    {
      label: "Task execution",
      value: `${stats.taskCompletion}%`,
      detail: `${data.openTasks} open, ${data.overdueTasks} overdue, ${data.highPriorityTasks} high priority`,
      icon: ClipboardCheck,
      severity: getTaskSeverity(data),
      href: "/app/tasks",
      action: "Open tasks",
    },
    {
      label: "Inventory posture",
      value: String(data.lowStockItems),
      detail: `${data.activeInventoryItems} active items, ${data.openPurchases} open purchases`,
      icon: Boxes,
      severity: getInventorySeverity(data),
      href: "/app/inventory",
      action: "Check stock",
    },
    {
      label: "Manager risk",
      value: String(
        stats.pendingTimeOff +
          data.unassignedShiftsToday +
          data.overdueTasks +
          data.lowStockItems +
          data.overduePurchases,
      ),
      detail: `${stats.pendingTimeOff} time-off requests, ${data.overduePurchases} late purchases`,
      icon: ShieldAlert,
      severity:
        stats.pendingTimeOff +
          data.unassignedShiftsToday +
          data.overdueTasks +
          data.lowStockItems +
          data.overduePurchases >
        0
          ? "urgent"
          : "good",
      href: "/app/reports",
      action: "Review risk",
    },
  ];
}

function buildManagerActions(
  stats: DashboardStats,
  data: OperatorCommandCenterData,
): ManagerAction[] {
  const actions: ManagerAction[] = [];

  if (data.unassignedShiftsToday > 0 || data.draftShiftsToday > 0) {
    actions.push({
      label: "Finalize today's schedule",
      detail: `${data.unassignedShiftsToday} unassigned and ${data.draftShiftsToday} draft shifts need manager attention.`,
      href: "/app/enhanced-scheduling",
      severity: "urgent",
    });
  }

  if (stats.pendingTimeOff > 0) {
    actions.push({
      label: "Review time-off queue",
      detail: `${stats.pendingTimeOff} pending requests can affect upcoming coverage.`,
      href: "/app/scheduling/timeoff",
      severity: "watch",
    });
  }

  if (data.overdueTasks > 0 || data.highPriorityTasks > 0) {
    actions.push({
      label: "Clear task blockers",
      detail: `${data.overdueTasks} overdue and ${data.highPriorityTasks} high-priority tasks are still open.`,
      href: "/app/tasks",
      severity: "urgent",
    });
  }

  if (data.lowStockItems > 0) {
    actions.push({
      label: "Reorder low-stock items",
      detail: `${data.lowStockItems} inventory items are at or below par.`,
      href: "/app/inventory",
      severity: data.lowStockItems > 5 ? "urgent" : "watch",
    });
  }

  if (data.openPurchases > 0) {
    actions.push({
      label: "Track purchasing",
      detail: `${data.openPurchases} open purchases total ${currencyFormatter.format(data.openPurchaseValue)}.`,
      href: "/app/inventory/purchasing",
      severity: data.overduePurchases > 0 ? "urgent" : "watch",
    });
  }

  if (actions.length > 0) return actions.slice(0, 5);

  return [
    {
      label: "Walk the floor plan",
      detail: "Schedule, labor, task, and inventory signals are steady for today.",
      href: "/app/enhanced-scheduling",
      severity: "good",
    },
    {
      label: "Review reports",
      detail: "Use the reporting view to spot trends before they become issues.",
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
  const {
    data,
    loading: commandLoading,
    error: commandError,
    refetch,
  } = useOperatorCommandCenterData();
  const loading = statsLoading || commandLoading;
  const cards = buildCards(stats, data);
  const actions = buildManagerActions(stats, data);
  const urgentCount = cards.filter((card) => card.severity === "urgent").length;
  const watchCount = cards.filter((card) => card.severity === "watch").length;
  const error = statsError ?? commandError;

  const handleRetry = () => {
    onRetry?.();
    void refetch();
  };

  return (
    <section className="space-y-4" aria-label="Operator command center">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1 space-y-2">
            <AlertTitle>Command center data needs attention</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={loading}
              >
                Retry
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader className="gap-3 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-xl">Today&apos;s command center</CardTitle>
            <CardDescription>
              Labor, inventory, task, schedule, and risk signals for the active
              tenant.
            </CardDescription>
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
              {urgentCount} urgent
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
              {watchCount} watch
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
                          {styles.label}
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
                    Manager action queue
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Ranked by what can disrupt today&apos;s operation.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link to="/app/tasks">
                    Open work
                    <ArrowUpRight className="ml-1 h-4 w-4" />
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
                          {severityStyles[action.severity].label}
                        </Badge>
                      </Link>
                    ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Cost pulse</h2>
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
                        data.laborCostToday + data.openPurchaseValue,
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scheduled labor plus open purchase exposure.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">Labor</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(data.laborCostToday)}
                      </div>
                    </div>
                    <div className="rounded-md bg-background p-3">
                      <div className="text-muted-foreground">Purchasing</div>
                      <div className="font-semibold">
                        {currencyFormatter.format(data.openPurchaseValue)}
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
