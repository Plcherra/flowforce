import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
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
import type { SchedulingPanelId } from "../types/panels";
import type { SchedulingRole } from "../hooks/useSchedulingRole";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type Tone = "steady" | "watch" | "urgent";
type ReadinessAction = SchedulingPanelId | "schedule" | "reports";

const toneStyles: Record<
  Tone,
  { item: string; icon: string; badge: string; label: string }
> = {
  steady: {
    item: "border-emerald-200 bg-emerald-50/45 dark:border-emerald-900 dark:bg-emerald-950/30",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    label: "Ready",
  },
  watch: {
    item: "border-amber-200 bg-amber-50/55 dark:border-amber-900 dark:bg-amber-950/30",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    badge: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    label: "Watch",
  },
  urgent: {
    item: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
    icon: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
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

function SummarySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        count >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
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

interface ReadinessCardItem {
  label: string;
  value: string | number;
  detail: string;
  action: string;
  actionTarget: ReadinessAction;
  icon: typeof CalendarCheck;
  tone: Tone;
  externalHref?: string;
}

function ReadinessCard({
  item,
  onAction,
}: {
  item: ReadinessCardItem;
  onAction?: (target: ReadinessAction) => void;
}) {
  const Icon = item.icon;
  const styles = toneStyles[item.tone];

  const cardBody = (
    <>
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
          <div className="mt-1 text-2xl font-semibold">{item.value}</div>
        </div>
        <Badge variant="outline" className={styles.badge}>
          {styles.label}
        </Badge>
      </div>
      <p className="mt-3 min-h-10 text-sm leading-snug text-muted-foreground">
        {item.detail}
      </p>
      <div className="mt-4">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {item.action}
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </>
  );

  if (item.externalHref) {
    return (
      <a
        href={item.externalHref}
        className={cn(
          "group block rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
          styles.item,
        )}
      >
        {cardBody}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAction?.(item.actionTarget)}
      className={cn(
        "group w-full rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
        styles.item,
      )}
    >
      {cardBody}
    </button>
  );
}

function StaffReadinessPanel({
  locationFilter,
  profileId,
  onAction,
}: {
  locationFilter?: string;
  profileId: string | null;
  onAction?: (target: ReadinessAction) => void;
}) {
  const {
    shifts,
    assignments,
    timeOff,
    loading,
    isFallbackData,
    error,
  } = useScheduling();

  const myShifts = useMemo(() => {
    const filtered = locationFilter
      ? shifts.filter((shift) => (shift.location ?? "") === locationFilter)
      : shifts;
    if (!profileId) return filtered;
    return filtered.filter((shift) =>
      shift.assignments?.some((assignment) => assignment.user_id === profileId),
    );
  }, [locationFilter, profileId, shifts]);

  const myShiftCount = myShifts.length;

  const myHours = useMemo(() => {
    let totalMinutes = 0;
    myShifts.forEach((shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      totalMinutes += Math.max(0, (end.getTime() - start.getTime()) / 60000);
    });
    return (totalMinutes / 60).toFixed(1);
  }, [myShifts]);

  const pendingTimeOff = timeOff.filter(
    (request) =>
      request.status === "requested" &&
      (!profileId || request.user_id === profileId),
  ).length;

  const items: ReadinessCardItem[] = [
    {
      label: "My shifts",
      value: myShiftCount,
      detail:
        myShiftCount > 0
          ? `${myShiftCount} published shifts this week.`
          : "No published shifts assigned yet this week.",
      action: "View schedule",
      actionTarget: "schedule",
      icon: CalendarDays,
      tone: myShiftCount > 0 ? "steady" : "watch",
    },
    {
      label: "Scheduled hours",
      value: myHours,
      detail: "Total hours on your published shifts this week.",
      action: "View schedule",
      actionTarget: "schedule",
      icon: Clock,
      tone: Number(myHours) > 0 ? "steady" : "watch",
    },
    {
      label: "Time off",
      value: pendingTimeOff,
      detail:
        pendingTimeOff > 0
          ? `${pendingTimeOff} pending request${pendingTimeOff === 1 ? "" : "s"} awaiting review.`
          : "No pending time off requests.",
      action: pendingTimeOff > 0 ? "View requests" : "Request time off",
      actionTarget: "timeoff",
      icon: CalendarCheck,
      tone: countTone(pendingTimeOff),
    },
    {
      label: "Availability",
      value: "—",
      detail: "Keep your availability up to date so managers can schedule you.",
      action: "Update availability",
      actionTarget: "availability",
      icon: UserPlus,
      tone: "steady",
    },
  ];

  return (
    <section
      className="space-y-4 rounded-lg border bg-background p-4"
      aria-label="My schedule summary"
    >
      <div>
        <h2 className="text-base font-semibold">This week</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your published shifts, hours, and personal scheduling requests.
        </p>
      </div>

      {(isFallbackData || error) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {error ? "Scheduling data needs attention" : "Preview mode"}
          </AlertTitle>
          <AlertDescription>
            {error ??
              "Live scheduling data is unavailable, so your schedule is read-only."}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <SummarySkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <ReadinessCard key={item.label} item={item} onAction={onAction} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Need a change?</div>
          <p className="text-sm text-muted-foreground">
            Update availability, request time off, or view swap options from
            here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("availability")}
          >
            Availability
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("timeoff")}
          >
            Time off
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("swaps")}
          >
            Swaps
          </Button>
        </div>
      </div>
    </section>
  );
}

function ManagerReadinessPanel({
  locationFilter,
  onAction,
}: {
  locationFilter?: string;
  onAction?: (target: ReadinessAction) => void;
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

  const items: ReadinessCardItem[] = [
    {
      label: "Shifts to publish",
      value: summary.draftCount,
      detail:
        summary.draftCount > 0
          ? `${summary.draftCount} draft shifts need review before publishing.`
          : "All shifts are published or ready for the week.",
      action: summary.draftCount > 0 ? "Review drafts" : "View schedule",
      actionTarget: "schedule",
      icon: CalendarCheck,
      tone: countTone(summary.draftCount, 1),
    },
    {
      label: "Open assignments",
      value: summary.unassignedCount,
      detail:
        summary.unassignedCount > 0
          ? `${summary.unassignedCount} shifts have no assigned teammate.`
          : "Every shift has at least one assignment.",
      action: "Assign staff",
      actionTarget: "availability",
      icon: UserPlus,
      tone: countTone(summary.unassignedCount),
    },
    {
      label: "Conflicts",
      value: summary.conflictCount,
      detail:
        summary.blockingConflictCount > 0
          ? `${summary.blockingConflictCount} blocking overlap or availability conflicts.`
          : summary.conflictCount > 0
            ? `${summary.conflictCount} warnings to review before publish.`
            : "No scheduling conflicts detected.",
      action: "Resolve conflicts",
      actionTarget: "timeoff",
      icon: ShieldAlert,
      tone: countTone(summary.blockingConflictCount || summary.conflictCount),
    },
    {
      label: "Labor hours",
      value: summary.scheduledLaborHours.toFixed(1),
      detail: "Scheduled labor hours for the current week.",
      action: "Open reports",
      actionTarget: "reports",
      externalHref: "/app/reports",
      icon: Clock,
      tone: summary.scheduledLaborHours > 0 ? "steady" : "watch",
    },
    {
      label: "Labor cost",
      value: moneyFormatter.format(summary.scheduledLaborCost),
      detail:
        summary.missingRateCount > 0
          ? `${summary.missingRateCount} shifts still need hourly rates.`
          : "Labor cost is fully estimated for scheduled shifts.",
      action: summary.missingRateCount > 0 ? "Add rates" : "View labor cost",
      actionTarget: "schedule",
      icon: DollarSign,
      tone: countTone(summary.missingRateCount, 1),
    },
  ];

  const openItems =
    summary.draftCount +
    summary.unassignedCount +
    summary.conflictCount +
    summary.missingRateCount;

  return (
    <section
      className="space-y-4 rounded-lg border bg-background p-4"
      aria-label="Schedule readiness"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Week readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign staff, resolve conflicts, and confirm labor cost before
            publishing.
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
          {items.map((item) => (
            <ReadinessCard key={item.label} item={item} onAction={onAction} />
          ))}
        </div>
      )}

      {summary.conflicts.length > 0 && (
        <div className="rounded-lg border bg-muted/25 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-medium">Conflict warnings</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-primary"
              onClick={() => onAction?.("timeoff")}
            >
              Review time off
            </Button>
          </div>
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
              {summary.conflicts.length - 4} more conflicts not shown here.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Before you publish</div>
          <p className="text-sm text-muted-foreground">
            Draft shifts, assign teammates, fix conflicts, then publish the week
            from the board toolbar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("availability")}
          >
            Availability
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("timeoff")}
          >
            Time off
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction?.("swaps")}
          >
            Swaps
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ScheduleReadinessPanel({
  locationFilter,
  onAction,
  role,
}: {
  locationFilter?: string;
  onAction?: (target: ReadinessAction) => void;
  role: SchedulingRole;
}) {
  if (role.isStaff) {
    return (
      <StaffReadinessPanel
        locationFilter={locationFilter}
        profileId={role.profileId}
        onAction={onAction}
      />
    );
  }

  return (
    <ManagerReadinessPanel locationFilter={locationFilter} onAction={onAction} />
  );
}
