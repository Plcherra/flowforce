import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DragDropScheduleCalendar } from "./DragDropScheduleCalendar";
import { ShiftDetailsPanel } from "./ShiftDetailsPanel";
import { ScheduleEmptyState } from "./ScheduleEmptyState";
import type { SchedulingPanelId } from "../types/panels";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useSearchParams } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  addWeeks,
  addMonths,
  subMonths,
  subWeeks,
  startOfWeek,
} from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatCount } from "@/features/scheduling/utils/pluralize";
import {
  ScheduleRangeBar,
  type ScheduleRangeView,
} from "./ScheduleRangeBar";

type CalendarViewMode = ScheduleRangeView;

interface EnhancedCalendarViewProps {
  locationFilter?: string;
  onOpenPanel?: (panel: SchedulingPanelId) => void;
  onAutoScheduleClick?: () => void;
  onSuggestFills?: () => void;
  actionsDisabled?: boolean;
  readOnly?: boolean;
  profileId?: string | null;
  smartFillOpen?: boolean;
  onToggleSmartFill?: () => void;
}

export function EnhancedCalendarView({
  locationFilter,
  onOpenPanel,
  onAutoScheduleClick,
  onSuggestFills,
  actionsDisabled = false,
  readOnly = false,
  profileId = null,
  smartFillOpen = false,
  onToggleSmartFill,
}: EnhancedCalendarViewProps) {
  const { shifts, loading, setWeekReference, weekRange } = useScheduling();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedShiftId = searchParams.get("shift");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<CalendarViewMode>("week");
  const dismissedShiftIdRef = useRef<string | null>(null);
  const openedShiftIdRef = useRef<string | null>(null);
  const pendingShiftWeekRef = useRef<{
    shiftId: string;
    weekStart: number;
    shiftsSnapshot: typeof shifts;
  } | null>(null);

  const clearShiftParam = useCallback(() => {
    setSearchParams((prev) => {
      if (!prev.get("shift")) return prev;
      const next = new URLSearchParams(prev);
      next.delete("shift");
      return next;
    });
  }, [setSearchParams]);

  const closeShiftSheet = useCallback(() => {
    if (requestedShiftId) {
      dismissedShiftIdRef.current = requestedShiftId;
    }
    setSelectedShift(null);
    clearShiftParam();
  }, [clearShiftParam, requestedShiftId]);

  useEffect(() => {
    if (!requestedShiftId) {
      dismissedShiftIdRef.current = null;
      openedShiftIdRef.current = null;
      pendingShiftWeekRef.current = null;
      return;
    }
    if (
      dismissedShiftIdRef.current === requestedShiftId ||
      openedShiftIdRef.current === requestedShiftId
    ) {
      return;
    }
    if (loading) return;

    if (shifts.some((shift) => shift.id === requestedShiftId)) {
      pendingShiftWeekRef.current = null;
      openedShiftIdRef.current = requestedShiftId;
      setSelectedShift(requestedShiftId);
      return;
    }

    const pending = pendingShiftWeekRef.current;
    if (pending?.shiftId === requestedShiftId) {
      const weekReady =
        startOfWeek(weekRange.start).getTime() === pending.weekStart;
      const shiftsUpdated = shifts !== pending.shiftsSnapshot;
      if (!weekReady || !shiftsUpdated) return;
      pendingShiftWeekRef.current = null;
      clearShiftParam();
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("start_time")
        .eq("id", requestedShiftId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data?.start_time) {
        if (!error) clearShiftParam();
        return;
      }
      const start = new Date(data.start_time);
      if (Number.isNaN(start.getTime())) {
        clearShiftParam();
        return;
      }
      const targetWeek = startOfWeek(start).getTime();
      if (targetWeek === startOfWeek(weekRange.start).getTime()) {
        clearShiftParam();
        return;
      }
      pendingShiftWeekRef.current = {
        shiftId: requestedShiftId,
        weekStart: targetWeek,
        shiftsSnapshot: shifts,
      };
      setSelectedDate(start);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    clearShiftParam,
    loading,
    requestedShiftId,
    shifts,
    weekRange.start,
  ]);

  const availableViews = readOnly
    ? (["week"] as CalendarViewMode[])
    : (["month", "week", "staff"] as CalendarViewMode[]);

  useEffect(() => {
    if (!weekRange) return;
    const selectedWeekStart = startOfWeek(selectedDate);
    if (selectedWeekStart.getTime() !== weekRange.start.getTime()) {
      setWeekReference(selectedDate);
    }
  }, [selectedDate, setWeekReference, weekRange]);

  const filteredShifts = useMemo(() => {
    let result = shifts;
    if (locationFilter) {
      const normalized = locationFilter.toLowerCase();
      result = result.filter((shift) =>
        (shift.location ?? "").toLowerCase().includes(normalized),
      );
    }
    if (readOnly && profileId) {
      result = result.filter((shift) =>
        shift.assignments?.some((assignment) => assignment.user_id === profileId),
      );
    }
    return result;
  }, [locationFilter, profileId, readOnly, shifts]);

  const navigateDate = (direction: "prev" | "next") => {
    let newDate = new Date(selectedDate);

    switch (currentView) {
      case "month":
        newDate =
          direction === "prev"
            ? subMonths(selectedDate, 1)
            : addMonths(selectedDate, 1);
        break;
      case "week":
      case "staff":
        newDate =
          direction === "prev"
            ? subWeeks(selectedDate, 1)
            : addWeeks(selectedDate, 1);
        break;
    }

    setSelectedDate(newDate);
  };

  const getDateRangeText = () => {
    switch (currentView) {
      case "month":
        return format(selectedDate, "MMMM yyyy");
      case "week":
      case "staff": {
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      }
      default:
        return "";
    }
  };

  const noShiftsAvailable = !loading && filteredShifts.length === 0;
  const shiftCountLabel = loading
    ? "Loading shifts"
    : formatCount(filteredShifts.length, "shift");

  return (
    <div id="schedule-board" className="flex min-h-0 flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-3 py-2">
          <ScheduleRangeBar
            title={readOnly ? "My Schedule" : "Schedule"}
            rangeLabel={getDateRangeText()}
            shiftCountLabel={shiftCountLabel}
            views={availableViews}
            currentView={currentView}
            onViewChange={setCurrentView}
            onPrevious={() => navigateDate("prev")}
            onNext={() => navigateDate("next")}
            onJumpToToday={() => setSelectedDate(new Date())}
          />
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading schedule...
                </p>
              </div>
            </div>
          ) : (
            <>
              {currentView === "month" &&
                (noShiftsAvailable ? (
                  <ScheduleEmptyState
                    view="month"
                    hasLocationFilter={Boolean(locationFilter)}
                    onSwitchToWeek={() => setCurrentView("week")}
                  />
                ) : (
                  <MonthView
                    schedules={filteredShifts}
                    selectedDate={selectedDate}
                    onSelectShift={setSelectedShift}
                    isMobile={isMobile}
                    locationFilter={locationFilter}
                  />
                ))}

              {currentView === "week" && (
                <DragDropScheduleCalendar
                  selectedDate={selectedDate}
                  locationFilter={locationFilter}
                  onAutoScheduleClick={onAutoScheduleClick}
                  autoScheduleDisabled={actionsDisabled}
                  readOnly={readOnly}
                  profileId={profileId}
                  onOpenPanel={onOpenPanel}
                  onSuggestFills={onSuggestFills}
                  smartFillOpen={smartFillOpen}
                  onToggleSmartFill={onToggleSmartFill}
                />
              )}

              {currentView === "staff" &&
                (noShiftsAvailable ? (
                  <ScheduleEmptyState
                    view="staff"
                    hasLocationFilter={Boolean(locationFilter)}
                    onSwitchToWeek={() => setCurrentView("week")}
                    onOpenStaffPanel={
                      onOpenPanel ? () => onOpenPanel("staff") : undefined
                    }
                  />
                ) : (
                  <WeekView
                    schedules={filteredShifts}
                    selectedDate={selectedDate}
                    onSelectShift={setSelectedShift}
                    isMobile={isMobile}
                    locationFilter={locationFilter}
                  />
                ))}
            </>
          )}
        </CardContent>
      </Card>

      {selectedShift && (
        <Sheet open={!!selectedShift} onOpenChange={() => closeShiftSheet()}>
          <SheetContent
            side="right"
            hideClose
            className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl"
          >
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={closeShiftSheet}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
