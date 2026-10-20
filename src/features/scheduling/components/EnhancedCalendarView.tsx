import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Grid3X3,
  LayoutGrid,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
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

type CalendarViewMode = "month" | "week" | "staff";

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

  const viewConfig: Record<
    CalendarViewMode,
    { icon: typeof LayoutGrid; label: string }
  > = {
    month: { icon: LayoutGrid, label: "Month" },
    week: { icon: Grid3X3, label: "Week" },
    staff: { icon: Users, label: "Staff Grid" },
  };

  const noShiftsAvailable = !loading && filteredShifts.length === 0;

  return (
    <div id="schedule-board" className="flex min-h-0 flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 space-y-0 px-3 py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Previous period"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[9.5rem] px-1 text-center">
                  <h2 className="text-sm font-semibold">
                    {getDateRangeText()}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Next period"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>

              <Badge variant="outline" className="h-6">
                {loading
                  ? "Loading…"
                  : `${filteredShifts.length} shift${filteredShifts.length === 1 ? "" : "s"}`}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {availableViews.map((view) => {
                const config = viewConfig[view];
                const Icon = config.icon;
                return (
                  <Button
                    key={view}
                    variant={currentView === view ? "default" : "outline"}
                    size="sm"
                    className="h-7 gap-1 px-2"
                    aria-label={config.label}
                    onClick={() => setCurrentView(view)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {!isMobile && config.label}
                  </Button>
                );
              })}

              {onToggleSmartFill ? (
                <Button
                  type="button"
                  variant={smartFillOpen ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1 px-2"
                  aria-pressed={smartFillOpen}
                  aria-label="Smart Fill"
                  title={smartFillOpen ? "Hide Smart Fill" : "Show Smart Fill"}
                  onClick={onToggleSmartFill}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Smart Fill</span>
                </Button>
              ) : null}

              {!readOnly && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-green-500" />
                    Published
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-yellow-500" />
                    Draft
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-red-500" />
                    Understaffed
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

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
