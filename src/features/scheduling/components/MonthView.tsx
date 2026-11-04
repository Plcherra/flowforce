import { useTranslation } from "react-i18next";
import {
  format,
  eachDayOfInterval,
  addDays,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useMemo, useState } from "react";
import { ShiftWizardDialog } from "./ShiftWizardDialog";
import { CalendarEventBlock } from "@/features/scheduling/components/CalendarEventBlock";
import { dateLocale } from "@/features/scheduling/utils/dateLocale";
import { monthGridRange } from "@/features/scheduling/utils/monthGrid";
import { shiftChipPaint, shiftIsOpen } from "@/features/scheduling/utils/shiftChipPaint";
import { getShiftColor } from "@/utils/schedulingUtils";

interface MonthViewProps {
  schedules: ShiftWithAssignments[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  onSelectEvent?: (eventId: string | null) => void;
  isMobile?: boolean;
  hideShiftActions?: boolean;
  overlayEvents?: CalendarEvent[];
  selectedEventId?: string | null;
  locationFilter?: string;
}

function shiftBlockStyle(shift: ShiftWithAssignments) {
  const paint = shiftChipPaint(
    getShiftColor(shift),
    shiftIsOpen(shift) ? "unassigned" : "assigned",
  );
  return {
    backgroundColor: paint.backgroundColor,
    color: paint.color,
    borderLeft: paint.borderLeft,
  };
}

export function MonthView({
  schedules,
  selectedDate,
  onSelectShift,
  onSelectEvent,
  isMobile = false,
  hideShiftActions = false,
  overlayEvents = [],
  selectedEventId = null,
  locationFilter,
}: MonthViewProps) {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.resolvedLanguage || i18n.language);
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const grid = monthGridRange(selectedDate);
  const gridDays = eachDayOfInterval({ start: grid.start, end: grid.end });
  const weekdayHeaders = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: addDays(startOfWeek(new Date()), 6),
  }).map((day) => format(day, isMobile ? "EEEEE" : "EEE", { locale }));

  const getShiftsForDay = (day: Date) => {
    return schedules.filter((schedule) =>
      isSameDay(parseISO(schedule.start_time), day),
    );
  };

  const getEventsForDay = useMemo(
    () => (day: Date) =>
      overlayEvents
        .filter((event) => isSameDay(new Date(event.start), day))
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        ),
    [overlayEvents],
  );

  const handleEventClick = (eventId: string) => {
    if (!onSelectEvent) return;
    if (selectedEventId === eventId) {
      onSelectEvent(null);
    } else {
      onSelectEvent(eventId);
    }
  };

  const openAdd = (day: Date) => {
    setQuickAddDate(day);
    setShowAddShift(true);
  };

  const addButton = (day: Date) =>
    hideShiftActions || !isSameMonth(day, selectedDate) ? null : (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 h-6 w-full text-xs"
        aria-label={t("schedule.newShift")}
        onClick={() => openAdd(day)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    );

  const wizard = hideShiftActions ? null : (
    <ShiftWizardDialog
      open={showAddShift}
      onOpenChange={(open) => {
        setShowAddShift(open);
        if (!open) setQuickAddDate(null);
      }}
      selectedDate={quickAddDate || selectedDate}
    />
  );

  if (isMobile) {
    return (
      <div className="p-2">
        {locationFilter && (
          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            {t("schedule.showingShiftsFor", { location: locationFilter })}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1">
          {weekdayHeaders.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="p-1 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {gridDays.map((day) => {
            const inMonth = isSameMonth(day, selectedDate);
            const dayShifts = inMonth ? getShiftsForDay(day) : [];
            const dayEvents = inMonth ? getEventsForDay(day) : [];

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] border border-border p-1 ${
                  inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <div className="mb-1 text-xs font-medium">{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      compact
                      selected={selectedEventId === event.id}
                      onSelect={handleEventClick}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      {t("schedule.moreSessions", { count: dayEvents.length - 2 })}
                    </div>
                  )}
                  {dayShifts.slice(0, 2).map((shift) => (
                    <div
                      key={shift.id}
                      className="cursor-pointer rounded p-1 text-xs hover:shadow-sm"
                      style={shiftBlockStyle(shift)}
                      onClick={() => onSelectShift(shift.id)}
                    >
                      <div className="truncate text-xs font-medium">
                        {shift.title || t("schedule.shiftSingular")}
                      </div>
                    </div>
                  ))}
                  {dayShifts.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayShifts.length - 2}
                    </div>
                  )}
                </div>
                {addButton(day)}
              </div>
            );
          })}
        </div>
        {wizard}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4">
      {locationFilter && (
        <p className="mb-3 text-sm text-muted-foreground">
          {t("schedule.filteredByLocation", { location: locationFilter })}
        </p>
      )}
      <div className="grid min-w-[720px] grid-cols-7 gap-1">
        {weekdayHeaders.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, selectedDate);
          const dayShifts = inMonth ? getShiftsForDay(day) : [];
          const dayEvents = inMonth ? getEventsForDay(day) : [];

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] border border-border p-2 ${
                inMonth ? "bg-background hover:bg-muted" : "bg-muted/30"
              }`}
            >
              <div
                className={`mb-2 text-sm font-medium ${
                  inMonth ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventBlock
                    key={event.id}
                    event={event}
                    compact
                    selected={selectedEventId === event.id}
                    onSelect={handleEventClick}
                  />
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    {t("schedule.moreSessions", { count: dayEvents.length - 3 })}
                  </div>
                )}

                {dayShifts.slice(0, 3).map((shift) => (
                  <div
                    key={shift.id}
                    className="cursor-pointer rounded p-1 text-xs transition-shadow hover:shadow-sm"
                    style={shiftBlockStyle(shift)}
                    onClick={() => onSelectShift(shift.id)}
                  >
                    <div className="truncate font-medium">
                      {shift.title || t("schedule.shiftSingular")}
                    </div>
                    <div className="opacity-90">
                      {format(new Date(shift.start_time), "HH:mm")}
                    </div>
                  </div>
                ))}

                {dayShifts.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    {t("schedule.moreItems", { count: dayShifts.length - 3 })}
                  </div>
                )}
                {inMonth && dayEvents.length === 0 && dayShifts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("schedule.noShiftsScheduled")}
                  </p>
                )}
              </div>
              {addButton(day)}
            </div>
          );
        })}
      </div>
      {wizard}
    </div>
  );
}
