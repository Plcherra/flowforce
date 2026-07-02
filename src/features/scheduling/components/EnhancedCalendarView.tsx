import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Grid3X3,
  LayoutGrid,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DragDropScheduleCalendar } from "./DragDropScheduleCalendar";
import { ShiftDetailsPanel } from "./ShiftDetailsPanel";
import { ScheduleEmptyState } from "./ScheduleEmptyState";
import type { SchedulingPanelId } from "../types/panels";
import { useScheduling } from "@/contexts/SchedulingContext";
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
}

export function EnhancedCalendarView({
  locationFilter,
  onOpenPanel,
  onAutoScheduleClick,
  onSuggestFills,
  actionsDisabled = false,
  readOnly = false,
  profileId = null,
}: EnhancedCalendarViewProps) {
  const { shifts, loading, setWeekReference, weekRange } = useScheduling();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<CalendarViewMode>("week");

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
        <CardHeader className="shrink-0 space-y-2 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[180px] px-1 text-center">
                  <h2 className="text-base font-semibold">
                    {getDateRangeText()}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>

              <Badge variant="outline" className="h-7">
                {loading
                  ? "Loading…"
                  : `${filteredShifts.length} shift${filteredShifts.length === 1 ? "" : "s"}`}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableViews.map((view) => {
                const config = viewConfig[view];
                const Icon = config.icon;
                return (
                  <Button
                    key={view}
                    variant={currentView === view ? "default" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setCurrentView(view)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {!isMobile && config.label}
                  </Button>
                );
              })}

              {!readOnly && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded bg-green-500" />
                <span>Published</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded bg-yellow-500" />
                <span>Draft</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded bg-red-500" />
                <span>Understaffed</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
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
        <Sheet
          open={!!selectedShift}
          onOpenChange={() => setSelectedShift(null)}
        >
          <SheetContent side="right" className="w-full p-0 sm:max-w-xl">
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={() => setSelectedShift(null)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
