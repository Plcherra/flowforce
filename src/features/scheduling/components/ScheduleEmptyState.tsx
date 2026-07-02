import { CalendarPlus, Clock, Copy, LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScheduleEmptyView = "month" | "week" | "staff";

interface ScheduleEmptyStateProps {
  view: ScheduleEmptyView;
  variant?: "banner" | "centered";
  hasLocationFilter?: boolean;
  readOnly?: boolean;
  onSwitchToWeek?: () => void;
  onOpenStaffPanel?: () => void;
  onOpenAvailability?: () => void;
  onCopyPreviousWeek?: () => void;
  onAddShift?: () => void;
  onSuggestFills?: () => void;
}

const managerCopyByView: Record<
  ScheduleEmptyView,
  { title: string; description: string; hint: string }
> = {
  week: {
    title: "No shifts this week",
    description:
      "Copy last week, add your first shift, or let Smart Fill suggest coverage.",
    hint: "Use the toolbar to copy last week or add shifts.",
  },
  month: {
    title: "No shifts this month",
    description:
      "Switch to the week board to drag in roles, copy a prior week, or add shifts one at a time.",
    hint: "Week view is the fastest way to build a schedule from scratch.",
  },
  staff: {
    title: "No staff shifts to show",
    description:
      "Add shifts on the week board first, then assign teammates from the staff panel or by dragging.",
    hint: "Open More options for swaps, time off, and availability.",
  },
};

const staffCopy = {
  title: "No shifts assigned yet",
  description:
    "When your manager publishes shifts for this week, they will appear here.",
  hint: "Update your availability so managers can schedule you accurately.",
};

export function ScheduleEmptyState({
  view,
  variant = "centered",
  hasLocationFilter = false,
  readOnly = false,
  onSwitchToWeek,
  onOpenStaffPanel,
  onOpenAvailability,
  onCopyPreviousWeek,
  onAddShift,
  onSuggestFills,
}: ScheduleEmptyStateProps) {
  const copy = readOnly ? staffCopy : managerCopyByView[view];

  if (variant === "banner") {
    return (
      <div
        className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="schedule-empty-banner"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            {readOnly ? (
              <Clock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{copy.title}</p>
            <p className="text-xs text-muted-foreground">{copy.description}</p>
            {hasLocationFilter ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Try clearing the location filter to see shifts at other sites.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {readOnly && onOpenAvailability ? (
            <Button size="sm" variant="outline" onClick={onOpenAvailability}>
              Update availability
            </Button>
          ) : null}
          {!readOnly && view === "week" && onCopyPreviousWeek ? (
            <Button size="sm" variant="outline" onClick={onCopyPreviousWeek}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy last week
            </Button>
          ) : null}
          {!readOnly && view === "week" && onAddShift ? (
            <Button size="sm" onClick={onAddShift}>
              Add first shift
            </Button>
          ) : null}
          {!readOnly && view === "week" && onSuggestFills ? (
            <Button size="sm" variant="secondary" onClick={onSuggestFills}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Suggest fills
            </Button>
          ) : null}
          {!readOnly && view !== "week" && onSwitchToWeek ? (
            <Button size="sm" onClick={onSwitchToWeek}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Open week board
            </Button>
          ) : null}
          {!readOnly && view === "staff" && onOpenStaffPanel ? (
            <Button size="sm" variant="outline" onClick={onOpenStaffPanel}>
              Staff management
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[320px] sm:px-6 sm:py-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {readOnly ? (
          <Clock className="h-6 w-6 text-muted-foreground" />
        ) : (
          <CalendarPlus className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold">{copy.title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {copy.description}
      </p>
      {hasLocationFilter ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Try clearing the location filter to see shifts at other sites.
        </p>
      ) : null}
      <p className="mt-3 max-w-sm text-xs text-muted-foreground">{copy.hint}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {readOnly && onOpenAvailability ? (
          <Button size="sm" variant="outline" onClick={onOpenAvailability}>
            Update availability
          </Button>
        ) : null}
        {!readOnly && view !== "week" && onSwitchToWeek ? (
          <Button size="sm" onClick={onSwitchToWeek}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Open week board
          </Button>
        ) : null}
        {!readOnly && view === "staff" && onOpenStaffPanel ? (
          <Button size="sm" variant="outline" onClick={onOpenStaffPanel}>
            Staff management
          </Button>
        ) : null}
      </div>
    </div>
  );
}
