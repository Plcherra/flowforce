import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduling } from "@/contexts/SchedulingContext";
import { buildScheduleReadinessSummary } from "../utils/scheduleReadiness";
import type { HoursSummary } from "../utils/hoursCalculation";
import type { SchedulingPanelId } from "../types/panels";
import type { SchedulingRole } from "../hooks/useSchedulingRole";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { formatCount } from "../utils/pluralize";
import { ScheduleMoreMenu } from "./ScheduleMoreMenu";

type Tone = "steady" | "watch" | "urgent";
type ReadinessAction = SchedulingPanelId | "schedule" | "reports";

const toneStyles: Record<
  Tone,
  { pill: string; badge: string; label: string }
> = {
  steady: {
    pill: "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    label: "Ready",
  },
  watch: {
    pill: "border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30",
    badge:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    label: "Watch",
  },
  urgent: {
    pill: "border-red-200/80 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
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

function PillSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-7 w-20 rounded-full" />
      ))}
    </div>
  );
}

interface ReadinessPillItem {
  id: string;
  label: string;
  value: string | number;
  actionTarget: ReadinessAction;
  tone: Tone;
  externalHref?: string;
}

function ReadinessPill({
  item,
  onAction,
}: {
  item: ReadinessPillItem;
  onAction?: (target: ReadinessAction) => void;
}) {
  const styles = toneStyles[item.tone];
  const className = cn(
    "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
    styles.pill,
  );

  const content = (
    <>
      <span className="font-semibold tabular-nums">{item.value}</span>
      <span className="text-muted-foreground">{item.label}</span>
    </>
  );

  if (item.externalHref) {
    return (
      <a href={item.externalHref} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAction?.(item.actionTarget)}
      className={className}
      data-testid={`schedule-readiness-pill-${item.id}`}
    >
      {content}
    </button>
  );
}

function StaffReadinessPanel({
  locationFilter,
  role,
  onAction,
  onOpenAvailability,
}: {
  locationFilter?: string;
  role: SchedulingRole;
  onAction?: (target: ReadinessAction) => void;
  onOpenAvailability?: (view: "personal" | "team") => void;
}) {
  const { shifts, timeOff, loading, isFallbackData, error } = useScheduling();
  const profileId = role.profileId;

  const myShifts = useMemo(() => {
    const filtered = locationFilter
      ? shifts.filter((shift) => (shift.location ?? "") === locationFilter)
      : shifts;
    const profileId = role.profileId;
    if (!profileId) return filtered;
    return filtered.filter((shift) =>
      shift.assignments?.some((assignment) => assignment.user_id === profileId),
    );
  }, [locationFilter, role.profileId, shifts]);

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

  const items: ReadinessPillItem[] = [
    {
      id: "shifts",
      label: myShiftCount === 1 ? "shift" : "shifts",
      value: myShiftCount,
      actionTarget: "schedule",
      tone: myShiftCount > 0 ? "steady" : "watch",
    },
    {
      id: "hrs",
      label: "hrs",
      value: myHours,
      actionTarget: "schedule",
      tone: Number(myHours) > 0 ? "steady" : "watch",
    },
    {
      id: "time off",
      label: "time off",
      value: pendingTimeOff,
      actionTarget: "timeoff",
      tone: countTone(pendingTimeOff),
    },
    {
      id: "availability",
      label: "availability",
      value: "Update",
      actionTarget: "availability",
      tone: "steady",
    },
  ];

  return (
    <section
      className="rounded-md border bg-background px-2 py-1"
      aria-label="My schedule summary"
      data-testid="schedule-readiness-bar"
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          This week
        </span>

        {(isFallbackData || error) && (
          <Badge variant={error ? "destructive" : "outline"} className="h-6">
            {error ? "Data error" : "Preview"}
          </Badge>
        )}

        {loading ? (
          <PillSkeleton count={4} />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {items.map((item) => (
              <ReadinessPill key={item.id} item={item} onAction={onAction} />
            ))}
          </div>
        )}

        <ScheduleMoreMenu
          role={role}
          onAction={onAction}
          onOpenAvailability={onOpenAvailability}
        />
      </div>

      {(isFallbackData || error) && (
        <Alert variant={error ? "destructive" : "default"} className="mt-1 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {error ? "Scheduling data needs attention" : "Preview mode"}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {error ??
              "Live scheduling data is unavailable, so your schedule is read-only."}
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

function ManagerReadinessPanel({
  locationFilter,
  role,
  onAction,
  onOpenAvailability,
  hoursSummary,
}: {
  locationFilter?: string;
  role: SchedulingRole;
  onAction?: (target: ReadinessAction) => void;
  onOpenAvailability?: (view: "personal" | "team") => void;
  hoursSummary?: HoursSummary;
}) {
  const {
    shifts,
    timeOff,
    unavailability,
    staffAvailability,
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
    staffAvailability,
  });

  const openItems =
    summary.draftCount +
    summary.unassignedCount +
    summary.conflictCount +
    summary.missingRateCount;

  const items: ReadinessPillItem[] = [
    {
      id: "drafts",
      label: summary.draftCount === 1 ? "draft" : "drafts",
      value: summary.draftCount,
      actionTarget: "schedule",
      tone: countTone(summary.draftCount, 1),
    },
    {
      id: "open",
      label: "open",
      value: summary.unassignedCount,
      actionTarget: "availability",
      tone: countTone(summary.unassignedCount),
    },
    {
      id: "conflicts",
      label: summary.conflictCount === 1 ? "conflict" : "conflicts",
      value: summary.conflictCount,
      actionTarget: "timeoff",
      tone: countTone(summary.blockingConflictCount || summary.conflictCount),
    },
    {
      id: "hrs",
      label: "hrs",
      value: summary.scheduledLaborHours.toFixed(1),
      actionTarget: "reports",
      externalHref: "/app/reports",
      tone: summary.scheduledLaborHours > 0 ? "steady" : "watch",
    },
    {
      id: "cost",
      label: "cost",
      value: moneyFormatter.format(summary.scheduledLaborCost),
      actionTarget: "schedule",
      tone: countTone(summary.missingRateCount, 1),
    },
  ];

  if (hoursSummary && hoursSummary.shiftCount > 0) {
    items.push({
      id: "coverage",
      label: "coverage",
      value: `${hoursSummary.filledCount}/${hoursSummary.shiftCount}`,
      actionTarget: "schedule",
      tone:
        hoursSummary.unfilledCount > 0
          ? countTone(hoursSummary.unfilledCount)
          : "steady",
    });
  }

  return (
    <section
      className="rounded-md border bg-background px-2 py-1"
      aria-label="Schedule readiness"
      data-testid="schedule-readiness-bar"
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Readiness
        </span>

        <Badge
          variant="outline"
          className={cn(
            "h-6 shrink-0 px-2 text-xs",
            openItems > 0 ? toneStyles.watch.badge : toneStyles.steady.badge,
          )}
        >
          {formatCount(summary.shiftCount, "shift")}
        </Badge>
        {openItems > 0 && (
          <Badge
            variant="outline"
            className={cn("h-6 shrink-0 px-2 text-xs", toneStyles.urgent.badge)}
          >
            {openItems} open
          </Badge>
        )}

        {(isFallbackData || error) && (
          <Badge variant={error ? "destructive" : "outline"} className="h-6">
            {error ? "Data error" : "Preview"}
          </Badge>
        )}

        {loading ? (
          <PillSkeleton count={6} />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {items.map((item) => (
              <ReadinessPill key={item.id} item={item} onAction={onAction} />
            ))}
          </div>
        )}

        <ScheduleMoreMenu
          role={role}
          conflicts={summary.conflicts}
          onAction={onAction}
          onOpenAvailability={onOpenAvailability}
        />
      </div>

      {(isFallbackData || error) && (
        <Alert variant={error ? "destructive" : "default"} className="mt-1 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {error ? "Scheduling data needs attention" : "Preview mode"}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {error ??
              "Live scheduling data is unavailable, so readiness checks are read-only."}
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

export function ScheduleReadinessPanel({
  locationFilter,
  onAction,
  onOpenAvailability,
  role,
  hoursSummary,
}: {
  locationFilter?: string;
  onAction?: (target: ReadinessAction) => void;
  onOpenAvailability?: (view: "personal" | "team") => void;
  role: SchedulingRole;
  hoursSummary?: HoursSummary;
}) {
  if (!role.canManageSchedule) {
    return (
      <StaffReadinessPanel
        locationFilter={locationFilter}
        role={role}
        onAction={onAction}
        onOpenAvailability={onOpenAvailability}
      />
    );
  }

  return (
    <ManagerReadinessPanel
      locationFilter={locationFilter}
      role={role}
      onAction={onAction}
      onOpenAvailability={onOpenAvailability}
      hoursSummary={hoursSummary}
    />
  );
}
