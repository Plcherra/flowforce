import { useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay, parseISO } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLocale } from "@/features/scheduling/utils/dateLocale";
import { shiftChipPaint, shiftIsOpen } from "@/features/scheduling/utils/shiftChipPaint";
import {
  formatShiftDuration,
  formatShiftWindow,
} from "@/features/scheduling/components/drag-drop/ShiftChip";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

export function usePhoneScheduleLayout() {
  const [isPhone, setIsPhone] = useState(false);

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isPhone;
}

function shiftsOnDay(shifts: ShiftWithAssignments[], day: Date) {
  return shifts
    .filter((shift) => {
      if (!shift.start_time) return false;
      const start = parseISO(shift.start_time);
      return !Number.isNaN(start.getTime()) && isSameDay(start, day);
    })
    .sort((left, right) => (left.start_time ?? "").localeCompare(right.start_time ?? ""));
}

function assignedNames(shift: ShiftWithAssignments) {
  return (shift.assignments ?? [])
    .map((assignment) => {
      const first = assignment.user?.first_name?.trim() ?? "";
      const last = assignment.user?.last_name?.trim() ?? "";
      return `${first} ${last}`.trim();
    })
    .filter((name) => name.length > 0);
}

interface MobileWeekBoardProps {
  weekDays: Date[];
  shifts: ShiftWithAssignments[];
  conflictByShiftId?: Map<string, boolean>;
  onShiftClick: (shiftId: string) => void;
  onAddShift?: (day: Date) => void;
}

export function MobileWeekBoard({
  weekDays,
  shifts,
  conflictByShiftId,
  onShiftClick,
  onAddShift,
}: MobileWeekBoardProps) {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.resolvedLanguage || i18n.language);
  const shiftsByDay = useMemo(
    () => weekDays.map((day) => ({ day, shifts: shiftsOnDay(shifts, day) })),
    [shifts, weekDays],
  );

  return (
    <div className="space-y-4 p-3" data-testid="schedule-mobile-week">
      {shiftsByDay.map(({ day, shifts: dayShifts }) => (
        <section key={day.toISOString()} className="space-y-2">
          <h3 className="flex items-center justify-between text-sm font-medium text-foreground">
            {format(day, "EEEE, MMM d", { locale })}
            {onAddShift ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                aria-label={t("schedule.newShift")}
                onClick={() => onAddShift(day)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </h3>
          {dayShifts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              {t("schedule.noShiftsScheduled")}
            </div>
          ) : (
            dayShifts.map((shift) => {
              const open = shiftIsOpen(shift);
              const paint = shiftChipPaint(shift.color, open ? "unassigned" : "assigned");
              const names = assignedNames(shift);
              const hasConflict = conflictByShiftId?.get(shift.id) ?? false;
              return (
                <button
                  key={shift.id}
                  type="button"
                  data-testid={`schedule-shift-${shift.id}`}
                  className="w-full rounded-lg border border-black/10 p-3 text-left shadow-sm"
                  style={{
                    backgroundColor: paint.backgroundColor,
                    color: paint.color,
                    borderLeft: paint.borderLeft,
                  }}
                  onClick={() => onShiftClick(shift.id)}
                >
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {hasConflict ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                    ) : null}
                    <span className="truncate">
                      {shift.title || shift.job_position?.name || t("schedule.shiftSingular")}
                    </span>
                  </div>
                  {shift.job_position?.name || shift.role ? (
                    <div className="truncate text-xs font-medium opacity-90">
                      {shift.job_position?.name || shift.role}
                    </div>
                  ) : null}
                  <div className="text-xs opacity-80">
                    {formatShiftWindow(shift, t("schedule.invalidTime"))}
                    {" · "}
                    {formatShiftDuration(shift, t("schedule.hoursAbbrev"))}
                  </div>
                  <div className="mt-1 text-xs opacity-80">
                    {names.length > 0
                      ? names.join(", ")
                      : open
                        ? t("schedule.openShift")
                        : t("schedule.unassignedShifts")}
                  </div>
                </button>
              );
            })
          )}
        </section>
      ))}
    </div>
  );
}
