import {
  AlertTriangle,
  ChevronDown,
  Clock,
  DollarSign,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduling } from "@/contexts/SchedulingContext";
import { buildScheduleReadinessSummary } from "../utils/scheduleReadiness";
import type { HoursSummary } from "../utils/hoursCalculation";
import type { SchedulingPanelId } from "../types/panels";
import type { SchedulingRole } from "../hooks/useSchedulingRole";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

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
        <Skeleton key={index} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  );
}

interface ReadinessPillItem {
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
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
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
      data-testid={`schedule-readiness-pill-${item.label}`}
    >
      {content}
    </button>
  );
}

function ReadinessDetails({
  onAction,
  conflicts,
  showManagerActions,
}: {
  onAction?: (target: ReadinessAction) => void;
  conflicts: Array<{ id: string; severity: string; type: string; message: string }>;
  showManagerActions: boolean;
}) {
  return (
    <div className="space-y-3 border-t pt-3">
      {conflicts.length > 0 && (
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Conflict warnings</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-primary"
              onClick={() => onAction?.("timeoff")}
            >
              Review time off
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {conflicts.slice(0, 4).map((conflict) => (
              <div
                key={conflict.id}
                data-testid={`schedule-readiness-conflict-${conflict.id}`}
                className="rounded-md border bg-background p-2 text-xs"
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
                <p className="mt-1 text-muted-foreground">{conflict.message}</p>
              </div>
            ))}
          </div>
          {conflicts.length > 4 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {conflicts.length - 4} more conflicts not shown.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onAction?.("availability")}
        >
          Availability
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onAction?.("timeoff")}
        >
          Time off
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onAction?.("swaps")}
        >
          Swaps
        </Button>
        {showManagerActions && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-primary"
            onClick={() => onAction?.("schedule")}
          >
            Go to board
          </Button>
        )}
      </div>
    </div>
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
  const { shifts, timeOff, loading, isFallbackData, error } = useScheduling();
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const items: ReadinessPillItem[] = [
    {
      label: "shifts",
      value: myShiftCount,
      actionTarget: "schedule",
      tone: myShiftCount > 0 ? "steady" : "watch",
    },
    {
      label: "hrs",
      value: myHours,
      actionTarget: "schedule",
      tone: Number(myHours) > 0 ? "steady" : "watch",
    },
    {
      label: "time off",
      value: pendingTimeOff,
      actionTarget: "timeoff",
      tone: countTone(pendingTimeOff),
    },
    {
      label: "availability",
      value: "Update",
      actionTarget: "availability",
      tone: "steady",
    },
  ];

  return (
    <section
      className="rounded-lg border bg-background px-3 py-2"
      aria-label="My schedule summary"
      data-testid="schedule-readiness-bar"
    >
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {items.map((item) => (
                <ReadinessPill
                  key={item.label}
                  item={item}
                  onAction={onAction}
                />
              ))}
            </div>
          )}

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              Details
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  detailsOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        {(isFallbackData || error) && (
          <Alert
            variant={error ? "destructive" : "default"}
            className="mt-2 py-2"
          >
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

        <CollapsibleContent>
          <ReadinessDetails
            onAction={onAction}
            conflicts={[]}
            showManagerActions={false}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function ManagerReadinessPanel({
  locationFilter,
  onAction,
  hoursSummary,
}: {
  locationFilter?: string;
  onAction?: (target: ReadinessAction) => void;
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
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const hasConflicts = summary.conflicts.length > 0;

  useEffect(() => {
    if (hasConflicts) {
      setDetailsOpen(true);
    }
  }, [hasConflicts, summary.conflicts.length]);

  const items: ReadinessPillItem[] = [
    {
      label: "drafts",
      value: summary.draftCount,
      actionTarget: "schedule",
      tone: countTone(summary.draftCount, 1),
    },
    {
      label: "open",
      value: summary.unassignedCount,
      actionTarget: "availability",
      tone: countTone(summary.unassignedCount),
    },
    {
      label: "conflicts",
      value: summary.conflictCount,
      actionTarget: "timeoff",
      tone: countTone(summary.blockingConflictCount || summary.conflictCount),
    },
    {
      label: "hrs",
      value: summary.scheduledLaborHours.toFixed(1),
      actionTarget: "reports",
      externalHref: "/app/reports",
      tone: summary.scheduledLaborHours > 0 ? "steady" : "watch",
    },
    {
      label: "cost",
      value: moneyFormatter.format(summary.scheduledLaborCost),
      actionTarget: "schedule",
      tone: countTone(summary.missingRateCount, 1),
    },
  ];

  if (hoursSummary && hoursSummary.shiftCount > 0) {
    items.push({
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
      className="rounded-lg border bg-background px-3 py-2"
      aria-label="Schedule readiness"
      data-testid="schedule-readiness-bar"
    >
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Readiness
          </span>

          <Badge
            variant="outline"
            className={cn(
              "h-7 px-2 text-xs",
              openItems > 0 ? toneStyles.watch.badge : toneStyles.steady.badge,
            )}
          >
            {summary.shiftCount} shifts
          </Badge>
          {openItems > 0 && (
            <Badge
              variant="outline"
              className={cn("h-7 px-2 text-xs", toneStyles.urgent.badge)}
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
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {items.map((item) => (
                <ReadinessPill
                  key={item.label}
                  item={item}
                  onAction={onAction}
                />
              ))}
            </div>
          )}

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              Details
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  detailsOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        {(isFallbackData || error) && (
          <Alert
            variant={error ? "destructive" : "default"}
            className="mt-2 py-2"
          >
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

        <CollapsibleContent>
          <ReadinessDetails
            onAction={onAction}
            conflicts={summary.conflicts}
            showManagerActions
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export function ScheduleReadinessPanel({
  locationFilter,
  onAction,
  role,
  hoursSummary,
}: {
  locationFilter?: string;
  onAction?: (target: ReadinessAction) => void;
  role: SchedulingRole;
  hoursSummary?: HoursSummary;
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
    <ManagerReadinessPanel
      locationFilter={locationFilter}
      onAction={onAction}
      hoursSummary={hoursSummary}
    />
  );
}
