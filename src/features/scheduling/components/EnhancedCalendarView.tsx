import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
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
  actionsDisabled?: boolean;
  readOnly?: boolean;
  profileId?: string | null;
}

export function EnhancedCalendarView({
  locationFilter,
  onOpenPanel,
  onAutoScheduleClick,
  actionsDisabled = false,
  readOnly = false,
  profileId = null,
}: EnhancedCalendarViewProps) {
  const { shifts, loading, setWeekReference, weekRange } = useScheduling();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<CalendarViewMode>(
    readOnly ? "week" : "week",
  );

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
    <div id="schedule-board" className="space-y-6">
      {/* Header with navigation and view selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[200px] text-center">
                  <h2 className="text-lg font-semibold">
                    {getDateRangeText()}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-2">
              {availableViews.map((view) => {
                const config = viewConfig[view];
                const Icon = config.icon;
                return (
                  <Button
                    key={view}
                    variant={currentView === view ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView(view)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {!isMobile && config.label}
                  </Button>
                );
              })}

              {!readOnly && (
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 border-t pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {loading
                  ? "Loading shifts…"
                  : `${filteredShifts.length} shift${filteredShifts.length === 1 ? "" : "s"}`}
              </Badge>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <span>Published</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-yellow-500" />
                  <span>Draft</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <span>Understaffed</span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Views */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">
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
                <div className="p-4">
                  {noShiftsAvailable ? (
                    <ScheduleEmptyState
                      view="week"
                      hasLocationFilter={Boolean(locationFilter)}
                      readOnly={readOnly}
                      onOpenAvailability={
                        onOpenPanel
                          ? () => onOpenPanel("availability")
                          : undefined
                      }
                    />
                  ) : null}
                  <DragDropScheduleCalendar
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    locationFilter={locationFilter}
                    onAutoScheduleClick={onAutoScheduleClick}
                    autoScheduleDisabled={actionsDisabled}
                    readOnly={readOnly}
                    profileId={profileId}
                    onOpenPanel={onOpenPanel}
                  />
                </div>
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

      {/* Shift Details Panel */}
      {selectedShift && (
        <Sheet
          open={!!selectedShift}
          onOpenChange={() => setSelectedShift(null)}
        >
          <SheetContent side="right" className="sm:max-w-xl w-full p-0">
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
