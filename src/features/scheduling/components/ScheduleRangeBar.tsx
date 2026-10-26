import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SchedulingHeader } from "./SchedulingHeader";

export type ScheduleRangeView = "month" | "week" | "staff";

const VIEW_LABEL: Record<ScheduleRangeView, string> = {
  month: "schedule.month",
  week: "schedule.week",
  staff: "schedule.staff",
};

interface ScheduleRangeBarProps {
  title: string;
  rangeLabel: string;
  shiftCountLabel: string;
  views: ScheduleRangeView[];
  currentView: ScheduleRangeView;
  onViewChange: (view: ScheduleRangeView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToToday: () => void;
}

export function ScheduleRangeBar({
  title,
  rangeLabel,
  shiftCountLabel,
  views,
  currentView,
  onViewChange,
  onPrevious,
  onNext,
  onJumpToToday,
}: ScheduleRangeBarProps) {
  const { t } = useTranslation();
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label={t("schedule.previousPeriod")}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-0 touch-pan-y rounded-2xl px-2 py-1 text-left hover:bg-primary/5"
          aria-label={t("schedule.jumpToTodayRange", { range: rangeLabel })}
          onPointerDown={(event) => {
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
            suppressClick.current = true;
            if (dx > 0) onPrevious();
            else onNext();
          }}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            onJumpToToday();
          }}
        >
          <SchedulingHeader title={title} />
          <span className="block text-base font-semibold leading-tight tracking-tight sm:text-lg">
            {rangeLabel}
          </span>
          <span className="text-[11px] text-muted-foreground">{shiftCountLabel}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label={t("schedule.nextPeriod")}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t("schedule.board")}
          className="inline-flex rounded-full bg-muted p-0.5"
        >
          {views.map((view) => {
            const selected = currentView === view;
            return (
              <button
                key={view}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground",
                  selected && "bg-background text-foreground shadow-sm",
                )}
                onClick={() => onViewChange(view)}
              >
                {t(VIEW_LABEL[view])}
              </button>
            );
          })}
        </div>
        <div id="schedule-chrome-slot" className="flex items-center gap-1" />
      </div>
    </div>
  );
}
