import { useTranslation } from "react-i18next";
import { format, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Users, Plus } from "lucide-react";
import type {
  ShiftWithAssignments,
  AssignmentWithUser,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { SchedulingFilterState } from "./SchedulingFilters";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useMemo, useState } from "react";
import { ShiftWizardDialog } from "./ShiftWizardDialog";
import { getShiftColor } from "@/utils/schedulingUtils";
import { DayEventNotice } from "@/features/scheduling/components/DayEventNotice";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";

interface DayViewProps {
  schedules: ShiftWithAssignments[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  onSelectEvent?: (eventId: string | null) => void;
  filters: SchedulingFilterState;
  isMobile?: boolean;
  hideShiftActions?: boolean;
  overlayEvents?: CalendarEvent[];
  selectedEventId?: string | null;
}

export function DayView({
  schedules,
  selectedDate,
  onSelectShift,
  filters: _filters,
  isMobile = false,
  hideShiftActions = false,
  overlayEvents = [],
}: DayViewProps) {
  const { t } = useTranslation();
  const [showAddShift, setShowAddShift] = useState(false);
  const dayShifts = schedules.filter((schedule) =>
    isSameDay(parseISO(schedule.start_time), selectedDate),
  );
  const dayEvents = useMemo(
    () =>
      overlayEvents
        .filter((event) => isSameDay(new Date(event.start), selectedDate))
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        ),
    [overlayEvents, selectedDate],
  );

  return (
    <div className={`p-${isMobile ? "4" : "6"}`}>
      <div className={`mb-${isMobile ? "4" : "6"}`}>
        <h2
          className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-foreground`}
        >
          {format(selectedDate, isMobile ? "EEE, MMM d" : "EEEE, MMMM d, yyyy")}
        </h2>
        <p className="text-muted-foreground">{dayShifts.length} shifts scheduled</p>
      </div>

      <div className="mb-6">
        <DayEventNotice count={dayEvents.length} className="text-xs" />
      </div>

      <div
        className={`grid grid-cols-1 ${isMobile ? "" : "lg:grid-cols-2"} gap-${isMobile ? "4" : "6"}`}
      >
        {/* Time-based view */}
        <div>
          <h3 className="flex items-center text-lg font-semibold mb-4">
            <Users className="h-5 w-5 mr-2" />
            {t("schedule.staffTimeline")}
          </h3>
          <div className="space-y-4">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourShifts = dayShifts.filter((shift) => {
                const startHour = new Date(shift.start_time).getHours();
                const endHour = new Date(shift.end_time).getHours();
                return hour >= startHour && hour < endHour;
              });

              // Get all users working during this hour
              const hourlyUsers = new Set<string>();
              hourShifts.forEach((shift) => {
                if (shift.assignments) {
                  shift.assignments.forEach(
                    (assignment: AssignmentWithUser) => {
                      if (assignment.user) {
                        hourlyUsers.add(
                          `${assignment.user.first_name} ${assignment.user.last_name}`,
                        );
                      }
                    },
                  );
                }
              });

              const userList = Array.from(hourlyUsers);

              return (
                <div
                  key={hour}
                  className="flex items-start border-l-2 border-border pl-4 min-h-[60px]"
                >
                  <div className="w-16 text-sm text-muted-foreground font-medium">
                    {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
                  </div>
                  <div className="flex-1 ml-4">
                    {userList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {userList.map((userName, index) => (
                          <div
                            key={index}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                          >
                            {userName}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        {t("schedule.noStaffScheduled")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift list */}
        <div>
          <h3 className="text-lg font-semibold mb-4">{t("schedule.allShifts")}</h3>
          {dayShifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">
                {t("schedule.noEventsScheduled")}
              </h4>
              {!hideShiftActions && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add shifts for {format(selectedDate, "MMMM d")} to get
                    started
                  </p>
                  <Button onClick={() => setShowAddShift(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("schedule.addShift")}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayShifts.map((shift) => {
                const paint = shiftChipPaint(
                  getShiftColor(shift),
                  shift.assignments?.length ? "assigned" : "unassigned",
                );
                return (
                <div
                  key={shift.id}
                  className="cursor-pointer rounded-lg border border-black/10 p-4 shadow-sm transition-shadow hover:shadow-md [&_.text-muted-foreground]:text-current [&_.text-muted-foreground]:opacity-80"
                  style={{
                    backgroundColor: paint.backgroundColor,
                    color: paint.color,
                    borderLeft: paint.borderLeft,
                  }}
                  onClick={() => onSelectShift(shift.id)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium">
                      {shift.title || shift.job_position?.name || "Shift"}
                    </h4>
                    <Badge
                      style={{
                        backgroundColor: getShiftColor(shift),
                        color: "white",
                      }}
                    >
                      {shift.job_position?.role || "Staff"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="font-medium">{t("schedule.time2")}</span>
                      </div>
                      <div className="ml-5">
                        {format(new Date(shift.start_time), "HH:mm")} -
                        {format(new Date(shift.end_time), "HH:mm")}
                      </div>
                      {shift.location && (
                        <div className="ml-5 text-muted-foreground">
                          📍 {shift.location}
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center mb-1">
                        <Users className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          Staff ({shift.assignments?.length || 0}/
                          {shift.required_headcount || 1}):
                        </span>
                      </div>
                      {shift.assignments && shift.assignments.length > 0 ? (
                        <div className="ml-5 flex -space-x-1">
                          {shift.assignments
                            ?.slice(0, 5)
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
                          {shift.assignments.length > 5 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-border text-xs flex items-center justify-center">
                              +{shift.assignments.length - 5}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="ml-5 text-muted-foreground italic">
                          {t("schedule.noStaffAssigned")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Badge
                      variant={shift.is_published ? "default" : "secondary"}
                    >
                      {shift.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Centralized Add Shift Dialog */}
      {!hideShiftActions && (
        <ShiftWizardDialog
          open={showAddShift}
          onOpenChange={setShowAddShift}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
