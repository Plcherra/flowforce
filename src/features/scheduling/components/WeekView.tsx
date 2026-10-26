import { useTranslation } from "react-i18next";
import { Fragment, useCallback, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import type {
  ShiftWithAssignments,
  AssignmentWithUser,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { ShiftWizardDialog } from "./ShiftWizardDialog";
import { getShiftColor, calculateCoverageStats } from "@/utils/schedulingUtils";
import { CalendarEventBlock } from "@/features/scheduling/components/CalendarEventBlock";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";
import { useShiftTextTranslations } from "@/features/scheduling/hooks/useScheduleTextTranslations";
import { ShiftGridCopy } from "@/features/scheduling/components/ShiftGridCopy";

interface WeekViewProps {
  schedules: ShiftWithAssignments[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  onSelectEvent?: (eventId: string | null) => void;
  isMobile?: boolean;
  overlayEvents?: CalendarEvent[];
  hideShiftActions?: boolean;
  selectedEventId?: string | null;
  locationFilter?: string;
}

export function WeekView({
  schedules,
  selectedDate,
  onSelectShift,
  onSelectEvent,
  isMobile = false,
  overlayEvents = [],
  hideShiftActions = false,
  selectedEventId = null,
  locationFilter,
}: WeekViewProps) {
  const { t } = useTranslation();
  const shiftSources = useMemo(
    () =>
      schedules.map((shift) => ({
        id: shift.id,
        title: shift.title,
        notes: shift.notes,
      })),
    [schedules],
  );
  const shiftTranslations = useShiftTextTranslations(shiftSources);
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = useCallback(
    (day: Date) => {
      return schedules.filter((schedule) =>
        isSameDay(parseISO(schedule.start_time), day),
      );
    },
    [schedules],
  );

  const getCoverageStats = useMemo(
    () => (day: Date) => {
      const dayShifts = getShiftsForDay(day);
      return calculateCoverageStats(dayShifts);
    },
    [getShiftsForDay],
  );

  const getEventsForDay = useMemo(
    () => (day: Date) =>
      overlayEvents.filter((event) => {
        const start = new Date(event.start);
        return !Number.isNaN(start.getTime()) && isSameDay(start, day);
      }),
    [overlayEvents],
  );

  if (isMobile) {
    // Mobile: Show simplified horizontal scrollable week view
    return (
      <div className="space-y-4">
        {locationFilter && (
          <p className="text-center text-xs text-muted-foreground">
            Viewing shifts for {locationFilter}
          </p>
        )}
        {/* Mobile week header */}
        <div className="overflow-x-auto">
          <div className="flex space-x-2 pb-2" style={{ minWidth: "700px" }}>
            {weekDays.map((day) => {
              const stats = getCoverageStats(day);
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-[90px] p-3 border rounded-lg bg-background"
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {format(day, "d")}
                    </div>
                    <div className="mt-1">
                      <div className="text-xs text-muted-foreground">
                        {stats.totalHours}h
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          stats.coverageRatio >= 1
                            ? "text-success"
                            : stats.coverageRatio >= 0.75
                              ? "text-warning"
                              : "text-destructive"
                        }`}
                      >
                        {stats.totalHeadcount}/{stats.requiredHeadcount}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile shifts list */}
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day.toISOString()} className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  {format(day, "EEEE, MMM d")}
                </h3>
                {getEventsForDay(day).map((event) => (
                  <CalendarEventBlock
                    key={event.id}
                    event={event}
                    selected={selectedEventId === event.id}
                    onSelect={onSelectEvent}
                  />
                ))}
                {dayShifts.length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    {t("schedule.noShiftsScheduled")}
                  </div>
                )}
                {dayShifts.map((shift) => {
                  const paint = shiftChipPaint(
                    getShiftColor(shift),
                    shift.assignments?.length ? "assigned" : "unassigned",
                  );
                  return (
                  <div
                    key={shift.id}
                    className="cursor-pointer rounded-lg border border-black/10 p-3 shadow-sm transition-shadow hover:shadow-md"
                    style={{
                      backgroundColor: paint.backgroundColor,
                      color: paint.color,
                      borderLeft: paint.borderLeft,
                    }}
                    onClick={() => onSelectShift(shift.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <ShiftGridCopy
                          shiftId={shift.id}
                          title={shift.title}
                          notes={shift.notes}
                          fallback={shift.job_position?.name || "Shift"}
                          translation={shiftTranslations.get(shift.id) ?? null}
                          titleClassName="text-sm font-medium"
                          notesClassName="text-xs opacity-80"
                        />
                        <div className="text-sm opacity-80">
                          {format(new Date(shift.start_time), "HH:mm")} -
                          {format(new Date(shift.end_time), "HH:mm")}
                        </div>
                      </div>
                      <Badge
                        variant={shift.is_published ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {shift.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {shift.assignments && shift.assignments.length > 0 && (
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex -space-x-1">
                          {shift.assignments
                            ?.slice(0, 3)
                            .map((assignment: AssignmentWithUser) => (
                              <Avatar
                                key={assignment.id}
                                className="h-6 w-6 border-2 border-border"
                              >
                                <AvatarImage
                                  src={assignment.user?.avatar_url}
                                />
                                <AvatarFallback className="text-xs">
                                  {assignment.user?.first_name?.[0]}
                                  {assignment.user?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          {shift.assignments.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-border text-xs flex items-center justify-center">
                              +{shift.assignments.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs opacity-80">
                          {shift.assignments.length} assigned
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {locationFilter && (
        <p className="mb-3 text-sm text-muted-foreground">
          Filtered by {locationFilter}
        </p>
      )}
      {/* Header with day names and coverage stats */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-4 border-r bg-muted/30">
          <div className="text-sm font-medium text-muted-foreground">{t("schedule.staff")}</div>
        </div>
        {weekDays.map((day) => {
          const stats = getCoverageStats(day);
          return (
            <div key={day.toISOString()} className="p-4 border-r">
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">
                  {format(day, "EEE")}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {format(day, "d")}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {stats.totalHours}h scheduled
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      stats.coverageRatio >= 1
                        ? "text-success"
                        : stats.coverageRatio >= 0.75
                          ? "text-warning"
                          : "text-destructive"
                    }`}
                  >
                    {stats.totalHeadcount}/{stats.requiredHeadcount} staff
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots and shifts - unified grid by rows to keep heights aligned */}
      <div className="flex-1 overflow-auto">
        {(() => {
          // Build a unified list of employees across the week, including an 'unassigned' bucket
          const employeeMap = new Map<
            string,
            {
              id: string;
              first_name: string;
              last_name: string;
              avatar_url: string | null;
            }
          >();
          weekDays.forEach((day) => {
            const dayShifts = getShiftsForDay(day);
            dayShifts.forEach((shift) => {
              if (shift.assignments && shift.assignments.length > 0) {
                shift.assignments.forEach((assignment: AssignmentWithUser) => {
                  if (assignment.user) {
                    const userId =
                      assignment.user.id ||
                      `${assignment.user.first_name}-${assignment.user.last_name}`;
                    if (!employeeMap.has(userId)) {
                      employeeMap.set(userId, {
                        id: assignment.user.id || userId,
                        first_name: assignment.user.first_name || "Unknown",
                        last_name: assignment.user.last_name || "Employee",
                        avatar_url: assignment.user.avatar_url || null,
                      });
                    }
                  }
                });
              } else {
                if (!employeeMap.has("unassigned")) {
                  employeeMap.set("unassigned", {
                    id: "unassigned",
                    first_name: "Unassigned",
                    last_name: "Shifts",
                    avatar_url: null,
                  });
                }
              }
            });
          });
          const employees = Array.from(employeeMap.values());

          const weekEvents = overlayEvents.length > 0;
          return (
            <div className="min-h-[600px]">
              <div className="grid grid-cols-8">
                {weekEvents ? (
                  <>
                    <div className="flex items-center border-r border-b border-border bg-muted/30 p-3 text-sm font-medium">
                      {t("common.events")}
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={`events-${day.toISOString()}`}
                        className="border-r border-b border-border p-1"
                      >
                        {getEventsForDay(day).map((event) => (
                          <CalendarEventBlock
                            key={event.id}
                            event={event}
                            selected={selectedEventId === event.id}
                            onSelect={onSelectEvent}
                          />
                        ))}
                      </div>
                    ))}
                  </>
                ) : null}
                {employees.map((employee) => (
                  <Fragment key={employee.id}>
                    <div className="border-r border-border bg-muted/30 p-3 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="text-sm">
                          {employee.first_name[0]}
                          {employee.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {employee.first_name} {employee.last_name}
                        </div>
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const employeeShifts = getShiftsForDay(day).filter(
                        (shift) => {
                          if (employee.id === "unassigned") {
                            return (
                              !shift.assignments ||
                              shift.assignments.length === 0
                            );
                          }
                          return shift.assignments?.some(
                            (assignment: AssignmentWithUser) =>
                              assignment.user &&
                              (assignment.user.id === employee.id ||
                                `${assignment.user.first_name}-${assignment.user.last_name}` ===
                                  employee.id),
                          );
                        },
                      );
                      return (
                        <div
                          key={`cell-${day.toISOString()}-${employee.id}`}
                          className="border-r border-b border-border p-1"
                        >
                          {employeeShifts.length === 0 ? (
                            <div className="h-16" />
                          ) : (
                            employeeShifts.map((shift) => {
                              const paint = shiftChipPaint(
                                getShiftColor(shift),
                                "assigned",
                              );
                              return (
                                <div
                                  key={shift.id}
                                  className="mb-1 cursor-pointer rounded-md border border-black/10 p-2 text-xs shadow-sm transition-shadow hover:shadow-md"
                                  style={{
                                    backgroundColor: paint.backgroundColor,
                                    color: paint.color,
                                    borderLeft: paint.borderLeft,
                                    opacity: shift.is_published ? 1 : 0.9,
                                  }}
                                  onClick={() => onSelectShift(shift.id)}
                                >
                                  <ShiftGridCopy
                                    shiftId={shift.id}
                                    title={shift.title}
                                    notes={shift.notes}
                                    fallback={
                                      shift.job_position?.name || "Shift"
                                    }
                                    translation={
                                      shiftTranslations.get(shift.id) ?? null
                                    }
                                    titleClassName="mb-1 truncate font-medium"
                                    notesClassName="truncate opacity-90"
                                  />
                                  <div className="flex items-center gap-1 text-[11px] opacity-90">
                                    <Clock className="h-3 w-3" />
                                    {format(
                                      new Date(shift.start_time),
                                      "HH:mm",
                                    )}{" "}
                                    -{" "}
                                    {format(new Date(shift.end_time), "HH:mm")}
                                  </div>
                                  {!shift.is_published && (
                                    <Badge
                                      variant="secondary"
                                      className="mt-1 text-[10px]"
                                    >
                                      {t("schedule.draft")}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      {/* Centralized Add Shift Dialog */}
      {!hideShiftActions && (
        <ShiftWizardDialog
          open={showAddShift}
          onOpenChange={(open) => {
            setShowAddShift(open);
            if (!open) setQuickAddDate(null);
          }}
          selectedDate={quickAddDate || selectedDate}
        />
      )}
    </div>
  );
}
