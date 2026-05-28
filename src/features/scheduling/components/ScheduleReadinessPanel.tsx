import { Link } from "@/lib/router-adapter";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  DollarSign,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduling } from "@/contexts/SchedulingContext";
import { buildScheduleReadinessSummary } from "../utils/scheduleReadiness";
import { cn } from "@/lib/utils";

type Tone = "steady" | "watch" | "urgent";

const toneStyles: Record<
  Tone,
  { item: string; icon: string; badge: string; label: string }
> = {
  steady: {
    item: "border-emerald-200 bg-emerald-50/45",
    icon: "bg-emerald-100 text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Ready",
  },
  watch: {
    item: "border-amber-200 bg-amber-50/55",
    icon: "bg-amber-100 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Watch",
  },
  urgent: {
    item: "border-red-200 bg-red-50/60",
    icon: "bg-red-100 text-red-700",
    badge: "border-red-200 bg-red-50 text-red-700",
    label: "Fix",
  },
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function countTone(value: number, urgentAt = 1): Tone {
  if (value >= urgentAt && value > 0) return "urgent";
  if (value > 0) return "watch";
  return "steady";
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4">
          <Skeleton className="mb-4 h-9 w-9 rounded-md" />
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-2 h-7 w-14" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ScheduleReadinessPanel({
  locationFilter,
}: {
  locationFilter?: string;
}) {
  const {
    shifts,
    timeOff,
    unavailability,
    loading,
    isFallbackData,
    error,
  } = useScheduling();
  const filteredShifts = locationFilter
    ? shifts.filter((shift) => (shift.location ?? "") === locationFilter)
    : shifts;
  const summary = buildScheduleReadinessSummary({
    shifts: filteredShifts,
    timeOff,
    unavailability,
  });

  const items = [
    {
      label: "Shift plan",
      value: summary.shiftCount,
      detail: `${summary.draftCount} draft shifts need publish review.`,
      href: "/app/enhanced-scheduling",
      action: "Review week",
      icon: CalendarCheck,
      tone: countTone(summary.draftCount, 3),
    },
    {
      label: "Assignment gaps",
      value: summary.understaffedCount,
      detail: `${summary.unassignedCount} shifts have no assigned teammate.`,
      href: "/app/enhanced-scheduling?tab=schedule",
      action: "Assign staff",
      icon: UserPlus,
      tone: countTone(summary.understaffedCount),
    },
    {
      label: "Conflicts",
      value: summary.conflictCount,
      detail: `${summary.blockingConflictCount} blocking availability or overlap conflicts.`,
      href: "/app/enhanced-scheduling?tab=staff",
      action: "Resolve conflicts",
      icon: ShieldAlert,
      tone: countTone(summary.blockingConflictCount || summary.conflictCount),
    },
    {
      label: "Labor hours",
      value: summary.scheduledLaborHours.toFixed(1),
      detail: "Net scheduled labor hours with required headcount.",
      href: "/app/reports",
      action: "Open reports",
      icon: Clock,
      tone: summary.scheduledLaborHours > 0 ? "steady" : "watch",
    },
    {
      label: "Labor cost",
      value: moneyFormatter.format(summary.scheduledLaborCost),
      detail: `${summary.missingRateCount} shifts still need hourly rates.`,
      href: "/app/enhanced-scheduling?tab=schedule",
      action: "Add rates",
      icon: DollarSign,
      tone: countTone(summary.missingRateCount, 3),
    },
  ] as const;

  const openItems =
    summary.draftCount +
    summary.understaffedCount +
    summary.conflictCount +
    summary.missingRateCount;

  return (
    <section
      className="space-y-4 rounded-lg border bg-background p-4"
      aria-label="Schedule readiness"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Schedule readiness</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Build, assign, check conflicts, and prepare labor cost before
            publishing the week.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-3",
              openItems > 0 ? toneStyles.watch.badge : toneStyles.steady.badge,
            )}
          >
            {summary.shiftCount} shifts
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-3",
              openItems > 0
                ? toneStyles.urgent.badge
                : toneStyles.steady.badge,
            )}
          >
            {openItems} open items
          </Badge>
        </div>
      </div>

      {(isFallbackData || error) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {error ? "Scheduling data needs attention" : "Preview mode"}
          </AlertTitle>
          <AlertDescription>
            {error ??
              "Live scheduling data is unavailable, so readiness checks are read-only."}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <SummarySkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const styles = toneStyles[item.tone];
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "group rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
                  styles.item,
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
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {item.value}
                    </div>
                  </div>
                  <Badge variant="outline" className={styles.badge}>
                    {styles.label}
                  </Badge>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-snug text-muted-foreground">
                  {item.detail}
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {item.action}
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {summary.conflicts.length > 0 && (
        <div className="rounded-lg border bg-muted/25 p-3">
          <div className="mb-2 font-medium">Conflict warnings</div>
          <div className="grid gap-2 md:grid-cols-2">
            {summary.conflicts.slice(0, 4).map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-md border bg-background p-3 text-sm"
              >
                <Badge
                  variant="outline"
                  className={
                    conflict.severity === "blocking"
                      ? toneStyles.urgent.badge
                      : toneStyles.watch.badge
                  }
                >
                  {conflict.type.replace(/_/g, " ")}
                </Badge>
                <p className="mt-2 text-muted-foreground">{conflict.message}</p>
              </div>
            ))}
          </div>
          {summary.conflicts.length > 4 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.conflicts.length - 4} more conflicts hidden from this
              summary.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium">Manager publish flow</div>
          <p className="text-sm text-muted-foreground">
            Create shifts as drafts, assign staff, resolve conflicts, add labor
            rates, then publish the week.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/app/availability/manage">Availability</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/app/scheduling/timeoff">Time off</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
