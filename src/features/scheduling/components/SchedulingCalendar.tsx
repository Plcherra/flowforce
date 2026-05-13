import { useEffect, useMemo, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarGrid } from "./CalendarGrid";
import { ScheduleHeader } from "./ScheduleHeader";
import { ShiftDetailsPanel } from "./ShiftDetailsPanel";
import { ViewSelector } from "./ViewSelector";
import {
  SchedulingFilters,
  type SchedulingFilterState,
} from "./SchedulingFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { ViewType } from "@/types/scheduling-unified";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { EventDetailsDrawer } from "@/features/calendar/components/EventDetailsDrawer";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  getSupabaseSetupMessage,
  isMissingBackendResourceError,
} from "@/shared/utils/supabaseErrors";
import { CalendarDays } from "lucide-react";

const INITIAL_FILTERS: SchedulingFilterState = {
  positions: [],
  users: [],
  status: "all",
  published: "all",
};
const SCHEDULING_CALENDAR_RESOURCE_NAMES = [
  "schedules",
  "schedule_assignments",
  "calendar_events_full",
  "calendar_events",
];

type CalendarMode = "scheduling" | "events";

interface SchedulingCalendarProps {
  mode?: CalendarMode;
  onCreateShift?: () => void;
  hideShiftActions?: boolean;
  externalDetails?: boolean;
  onShiftSelect?: (shiftId: string | null) => void;
}

export function SchedulingCalendar({
  mode = "scheduling",
  onCreateShift: _onCreateShift,
  hideShiftActions = false,
  externalDetails = false,
  onShiftSelect,
}: SchedulingCalendarProps = {}) {
  const { shifts, loading, error: schedulingError } = useScheduling();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<ViewType>(
    isMobile ? "day" : "week",
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] =
    useState<SchedulingFilterState>(INITIAL_FILTERS);
  const isSchedulingMode = mode === "scheduling";
  const effectiveHideShiftActions = hideShiftActions || !isSchedulingMode;

  const eventRange = useMemo(() => {
    if (currentView === "month") {
      return {
        start: startOfDay(startOfMonth(selectedDate)),
        end: endOfDay(endOfMonth(selectedDate)),
      };
    }
    if (currentView === "day") {
      return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
    }
    return {
      start: startOfDay(startOfWeek(selectedDate)),
      end: endOfDay(endOfWeek(selectedDate)),
    };
  }, [currentView, selectedDate]);

  const {
    events: overlayEvents,
    loading: eventsLoading,
    refresh: refreshEvents,
    error: eventsError,
  } = useCalendarEvents({ range: eventRange });

  const filteredShifts = useMemo<ShiftWithAssignments[]>(() => {
    return shifts.filter((shift) => {
      if (filters.published !== "all") {
        if (filters.published === "published" && !shift.is_published)
          return false;
        if (filters.published === "draft" && shift.is_published) return false;
      }

      if (
        filters.positions.length > 0 &&
        (!shift.position_id || !filters.positions.includes(shift.position_id))
      ) {
        return false;
      }

      if (filters.users.length > 0) {
        const assignedUserIds = shift.assignments
          .map((assignment) => assignment.user_id)
          .filter(Boolean);
        if (!assignedUserIds.some((id) => filters.users.includes(id))) {
          return false;
        }
      }

      if (filters.status !== "all") {
        const assignedCount = shift.assignments.length;
        const requiredHeadcount = shift.required_headcount ?? 0;
        switch (filters.status) {
          case "assigned":
            if (assignedCount === 0) return false;
            break;
          case "unassigned":
            if (assignedCount > 0) return false;
            break;
          case "understaffed":
            if (requiredHeadcount > 0 && assignedCount >= requiredHeadcount)
              return false;
            break;
          case "overstaffed":
            if (requiredHeadcount > 0 && assignedCount <= requiredHeadcount)
              return false;
            break;
          default:
            break;
        }
      }

      return true;
    });
  }, [filters, shifts]);

  const selectedEvent = useMemo(
    () => overlayEvents.find((event) => event.id === selectedEventId) ?? null,
    [overlayEvents, selectedEventId],
  );
  const combinedLoading = loading || eventsLoading;
  const combinedError = schedulingError || eventsError;
  const setupMissing = isMissingBackendResourceError(
    combinedError,
    SCHEDULING_CALENDAR_RESOURCE_NAMES,
  );

  useEffect(() => {
    if (
      selectedShift &&
      !filteredShifts.some((shift) => shift.id === selectedShift)
    ) {
      setSelectedShift(null);
      if (onShiftSelect) onShiftSelect(null);
    }
  }, [filteredShifts, onShiftSelect, selectedShift]);

  useEffect(() => {
    if (
      selectedEventId &&
      !overlayEvents.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId(null);
    }
  }, [overlayEvents, selectedEventId]);

  const handleDateChange = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const selectedSchedule = selectedShift
    ? filteredShifts.find((s) => s.id === selectedShift)
    : null;

  const handleSelectShift = (id: string | null) => {
    setSelectedEventId(null);
    setSelectedShift(id);
    if (onShiftSelect) onShiftSelect(id);
  };

  const handleSelectEvent = (id: string | null) => {
    setSelectedShift(null);
    if (onShiftSelect) {
      onShiftSelect(null);
    }
    setSelectedEventId(id);
  };

  return (
    <div className="space-y-6">
      {setupMissing ? (
        <FeatureSetupRequiredState
          title="Scheduling calendar is not fully set up yet"
          description={getSupabaseSetupMessage(
            combinedError,
            "Scheduling calendar",
          )}
          icon={<CalendarDays className="h-5 w-5" />}
          setupDescription={
            <>
              Missing scheduling or calendar tables. Restore the migrations for{" "}
              <code>schedules</code> and <code>calendar_events_full</code>, then
              refresh this page.
            </>
          }
        />
      ) : combinedError ? (
        <FeatureErrorState
          title="Calendar data may be stale"
          description={combinedError}
        />
      ) : null}

      {setupMissing ? null : (
        <>
          <ScheduleHeader
            mode={mode}
            onPrevDate={() => handleDateChange("prev")}
            onNextDate={() => handleDateChange("next")}
            onToggleFilters={
              isSchedulingMode
                ? () => setShowFilters((previous) => !previous)
                : undefined
            }
            selectedDate={selectedDate}
            currentView={currentView}
            isMobile={isMobile}
            dateRangeText={selectedDate.toDateString()}
            showFilters={isSchedulingMode ? showFilters : false}
            hideToolbar={effectiveHideShiftActions || !isSchedulingMode}
          />

          <ViewSelector
            currentView={currentView}
            onViewChange={(view: ViewType) => setCurrentView(view)}
            isMobile={isMobile}
            mode={mode}
          />
        </>
      )}

      {!setupMissing && isSchedulingMode && showFilters && (
        <SchedulingFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {!setupMissing && (
        <div className={isMobile ? "" : "flex gap-6"}>
          <div className="flex-1">
            <CalendarGrid
              currentView={currentView}
              schedules={filteredShifts}
              selectedDate={selectedDate}
              onSelectShift={handleSelectShift}
              onSelectEvent={handleSelectEvent}
              filters={filters}
              loading={combinedLoading}
              isMobile={isMobile}
              overlayEvents={overlayEvents}
              hideShiftActions={effectiveHideShiftActions}
              selectedEventId={selectedEventId}
            />
          </div>

          {selectedShift &&
            selectedSchedule &&
            !isMobile &&
            !externalDetails && (
              <div className="w-96">
                <ShiftDetailsPanel
                  shiftId={selectedShift}
                  onClose={() => handleSelectShift(null)}
                />
              </div>
            )}
        </div>
      )}

      {!setupMissing &&
        selectedShift &&
        selectedSchedule &&
        isMobile &&
        !externalDetails && (
          <div className="fixed inset-0 bg-background z-50 overflow-auto">
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={() => handleSelectShift(null)}
            />
          </div>
        )}

      {!setupMissing && !externalDetails && (
        <EventDetailsDrawer
          event={selectedEvent}
          open={Boolean(selectedEventId)}
          onOpenChange={(open) => {
            if (!open) {
              handleSelectEvent(null);
            }
          }}
          onRefresh={refreshEvents}
        />
      )}
    </div>
  );
}
