import { useTranslation } from "react-i18next";
import { CalendarPlus, Clock, LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScheduleEmptyView = "month" | "week" | "staff";

interface ScheduleEmptyStateProps {
  view: ScheduleEmptyView;
  variant?: "banner" | "centered";
  hasLocationFilter?: boolean;
  readOnly?: boolean;
  unavailable?: boolean;
  onSwitchToWeek?: () => void;
  onOpenStaffPanel?: () => void;
  onOpenAvailability?: () => void;
  onSuggestFills?: () => void;
}

const managerCopyKey: Record<
  ScheduleEmptyView,
  { title: string; description: string; hint: string }
> = {
  week: {
    title: "schedule.emptyWeekTitle",
    description: "schedule.emptyWeekBody",
    hint: "schedule.emptyWeekHint",
  },
  month: {
    title: "schedule.emptyMonthTitle",
    description: "schedule.emptyMonthBody",
    hint: "schedule.emptyMonthHint",
  },
  staff: {
    title: "schedule.emptyStaffTitle",
    description: "schedule.emptyStaffBody",
    hint: "schedule.emptyStaffHint",
  },
};

const staffCopyKey = {
  title: "schedule.emptyMineTitle",
  description: "schedule.emptyMineBody",
  hint: "schedule.emptyMineHint",
};

const unavailableCopyKey = {
  title: "schedule.emptyUnavailableTitle",
  description: "schedule.emptyUnavailableBody",
  hint: "schedule.emptyUnavailableHint",
};

export function ScheduleEmptyState({
  view,
  variant = "centered",
  hasLocationFilter = false,
  readOnly = false,
  unavailable = false,
  onSwitchToWeek,
  onOpenStaffPanel,
  onOpenAvailability,
  onSuggestFills,
}: ScheduleEmptyStateProps) {
  const { t } = useTranslation();
  const copyKey = unavailable
    ? unavailableCopyKey
    : readOnly
      ? staffCopyKey
      : managerCopyKey[view];
  const copy = {
    title: t(copyKey.title),
    description: t(copyKey.description),
    hint: t(copyKey.hint),
  };

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
                {t("schedule.tryClearingTheLocationFilterToSeeShifts")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {readOnly && onOpenAvailability ? (
            <Button size="sm" variant="outline" onClick={onOpenAvailability}>
              {t("schedule.updateAvailability")}
            </Button>
          ) : null}
          {!readOnly && view === "week" && onSuggestFills ? (
            <Button size="sm" variant="secondary" onClick={onSuggestFills}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t("schedule.suggestFills")}
            </Button>
          ) : null}
          {!readOnly && view !== "week" && onSwitchToWeek ? (
            <Button size="sm" onClick={onSwitchToWeek}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              {t("schedule.openWeekBoard")}
            </Button>
          ) : null}
          {!readOnly && view === "staff" && onOpenStaffPanel ? (
            <Button size="sm" variant="outline" onClick={onOpenStaffPanel}>
              {t("schedule.teamRequests")}
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
          {t("schedule.tryClearingTheLocationFilterToSeeShifts")}
        </p>
      ) : null}
      <p className="mt-3 max-w-sm text-xs text-muted-foreground">{copy.hint}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {readOnly && onOpenAvailability ? (
          <Button size="sm" variant="outline" onClick={onOpenAvailability}>
            {t("schedule.updateAvailability")}
          </Button>
        ) : null}
        {!readOnly && view !== "week" && onSwitchToWeek ? (
          <Button size="sm" onClick={onSwitchToWeek}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            {t("schedule.openWeekBoard")}
          </Button>
        ) : null}
        {!readOnly && view === "staff" && onOpenStaffPanel ? (
          <Button size="sm" variant="outline" onClick={onOpenStaffPanel}>
            {t("schedule.teamRequests")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
