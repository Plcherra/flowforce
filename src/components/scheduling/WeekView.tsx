
import { Fragment, useCallback, useMemo, useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';
import type { ShiftWithAssignments, AssignmentWithUser } from '@/hooks/scheduling/useSchedulingConsolidated';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import { ShiftWizardDialog } from './ShiftWizardDialog';
import { getShiftColor, calculateCoverageStats } from '@/utils/schedulingUtils';

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
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = useCallback((day: Date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.start_time), day)
    );
  }, [schedules]);

  const getCoverageStats = useMemo(() => (day: Date) => {
    const dayShifts = getShiftsForDay(day);
    return calculateCoverageStats(dayShifts);
  }, [getShiftsForDay]);

  const getEventsForDay = useMemo(
    () => (day: Date) =>
      overlayEvents.filter((event) => {
        const start = new Date(event.start);
        return !Number.isNaN(start.getTime()) && isSameDay(start, day);
      }),
    [overlayEvents],
  );

  const eventsByShiftId = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    overlayEvents.forEach((event) => {
      const fallback = Array.isArray(event.raw?.related_shift_ids) ? event.raw.related_shift_ids : [];
      const ids = event.shiftIds?.length ? event.shiftIds : fallback;
      ids.forEach((shiftId) => {
        if (!shiftId) return;
        const list = map.get(shiftId) ?? [];
        list.push(event);
        map.set(shiftId, list);
      });
    });
    return map;
  }, [overlayEvents]);

  const handleEventClick = (eventId: string) => {
    if (!onSelectEvent) return;
    if (selectedEventId === eventId) {
      onSelectEvent(null);
    } else {
      onSelectEvent(eventId);
    }
  };

  const renderAttendeeSummary = (event: CalendarEvent) => {
    const attendees = event.attendees ?? [];
    if (attendees.length === 0) return null;
    const names = attendees.map((attendee) => attendee.name).filter(Boolean);
    if (names.length === 0) return null;
    const summary = names.slice(0, 2).join(', ');
    const extra = names.length > 2 ? ` +${names.length - 2}` : '';
    return (
      <div className="text-[11px] text-muted-foreground">
        {summary}
        {extra}
      </div>
    );
  };

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
          <div className="flex space-x-2 pb-2" style={{ minWidth: '700px' }}>
            {weekDays.map((day) => {
              const stats = getCoverageStats(day);
              return (
                <div key={day.toISOString()} className="flex-1 min-w-[90px] p-3 border rounded-lg bg-white">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {format(day, 'd')}
                    </div>
                    <div className="mt-1">
                      <div className="text-xs text-gray-500">
                        {stats.totalHours}h
                      </div>
                      <div className={`text-xs font-medium ${
                        stats.coverageRatio >= 1 ? 'text-green-600' : 
                        stats.coverageRatio >= 0.75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
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
                <h3 className="text-sm font-medium text-gray-900">
                  {format(day, 'EEEE, MMM d')}
                </h3>
                {dayShifts.length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No shifts scheduled
                  </div>
                )}
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: getShiftColor(shift), borderLeftWidth: '4px' }}
                    onClick={() => onSelectShift(shift.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {shift.title || shift.job_position?.name || 'Shift'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(shift.start_time), 'HH:mm')} - 
                          {format(new Date(shift.end_time), 'HH:mm')}
                        </div>
                      </div>
                      <Badge variant={shift.is_published ? "default" : "secondary"} className="text-xs">
                        {shift.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    
                    {shift.assignments && shift.assignments.length > 0 && (
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex -space-x-1">
                          {shift.assignments?.slice(0, 3).map((assignment: AssignmentWithUser) => (
                            <Avatar key={assignment.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={assignment.user?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {assignment.user?.first_name?.[0]}
                                {assignment.user?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {shift.assignments.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white text-xs flex items-center justify-center">
                              +{shift.assignments.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {shift.assignments.length} assigned
                        </span>
                      </div>
                    )}
                  </div>
                ))}
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
        <p className="mb-3 text-sm text-muted-foreground">Filtered by {locationFilter}</p>
      )}
      {/* Header with day names and coverage stats */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-4 border-r bg-muted/30">
          <div className="text-sm font-medium text-muted-foreground">Staff</div>
        </div>
        {weekDays.map((day) => {
          const stats = getCoverageStats(day);
          return (
            <div key={day.toISOString()} className="p-4 border-r">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {format(day, 'd')}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-gray-500">
                    {stats.totalHours}h scheduled
                  </div>
                  <div className={`text-xs font-medium ${
                    stats.coverageRatio >= 1 ? 'text-green-600' : 
                    stats.coverageRatio >= 0.75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.totalHeadcount}/{stats.requiredHeadcount} staff
                  </div>
                  {(() => {
                    const evs = getEventsForDay(day);
                    if (evs.length === 0) return null;
                    return (
                      <div className="text-[11px] text-primary/80">
                        {evs.length} event{evs.length > 1 ? 's' : ''}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-8 border-b bg-muted/40">
        <div className="p-3 border-r">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Meetings & Events
          </div>
          <div className="text-[11px] text-muted-foreground">Sessions linked to the schedule</div>
        </div>
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day)
            .slice()
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          return (
            <div key={`events-${day.toISOString()}`} className="border-r p-2">
              {dayEvents.length === 0 ? (
                <div className="h-20 flex items-center justify-center text-[11px] text-muted-foreground">
                  No sessions
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-md border border-border/60 bg-background p-2 text-xs shadow-sm transition hover:shadow-md cursor-pointer ${
                        selectedEventId === event.id ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ borderLeftColor: event.color ?? '#6366f1', borderLeftWidth: 4 }}
                      onClick={() => handleEventClick(event.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-foreground text-[13px] truncate">
                          {event.title || 'Untitled'}
                        </div>
                        {event.type && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {event.type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(event.start), 'HH:mm')} –{' '}
                        {event.end ? format(new Date(event.end), 'HH:mm') : 'TBD'}
                      </div>
                      {renderAttendeeSummary(event)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slots and shifts - unified grid by rows to keep heights aligned */}
      <div className="flex-1 overflow-auto">
        {(() => {
          // Build a unified list of employees across the week, including an 'unassigned' bucket
          const employeeMap = new Map<string, { id: string; first_name: string; last_name: string; avatar_url: string | null }>();
          weekDays.forEach(day => {
            const dayShifts = getShiftsForDay(day);
            dayShifts.forEach(shift => {
              if (shift.assignments && shift.assignments.length > 0) {
                shift.assignments.forEach((assignment: AssignmentWithUser) => {
                  if (assignment.user) {
                    const userId = assignment.user.id || `${assignment.user.first_name}-${assignment.user.last_name}`;
                    if (!employeeMap.has(userId)) {
                      employeeMap.set(userId, {
                        id: assignment.user.id || userId,
                        first_name: assignment.user.first_name || 'Unknown',
                        last_name: assignment.user.last_name || 'Employee',
                        avatar_url: assignment.user.avatar_url || null,
                      });
                    }
                  }
                });
              } else {
                if (!employeeMap.has('unassigned')) {
                  employeeMap.set('unassigned', {
                    id: 'unassigned',
                    first_name: 'Unassigned',
                    last_name: 'Shifts',
                    avatar_url: null,
                  });
                }
              }
            });
          });
          const employees = Array.from(employeeMap.values());

          return (
            <div className="min-h-[600px]">
              <div className="grid grid-cols-8">
                {employees.map((employee) => (
                  <Fragment key={employee.id}>
                    <div className="border-r border-border bg-muted/30 p-3 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="text-sm">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {employee.first_name} {employee.last_name}
                        </div>
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const employeeShifts = getShiftsForDay(day).filter(shift => {
                        if (employee.id === 'unassigned') {
                          return !shift.assignments || shift.assignments.length === 0;
                        }
                        return shift.assignments?.some((assignment: AssignmentWithUser) =>
                          assignment.user && (assignment.user.id === employee.id || `${assignment.user.first_name}-${assignment.user.last_name}` === employee.id)
                        );
                      });
                      return (
                        <div key={`cell-${day.toISOString()}-${employee.id}`} className="border-r border-b border-gray-100 p-1">
                          {employeeShifts.length === 0 ? (
                            <div className="h-16" />
                          ) : (
                            employeeShifts.map((shift) => {
                              const linkedEvents = eventsByShiftId.get(shift.id) ?? [];
                              return (
                                <div
                                  key={shift.id}
                                  className="rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-1 p-2 text-white text-xs"
                                  style={{
                                    backgroundColor: getShiftColor(shift),
                                    opacity: shift.is_published ? 1 : 0.9,
                                  }}
                                  onClick={() => onSelectShift(shift.id)}
                                >
                                  <div className="font-medium truncate mb-1">
                                    {shift.title || shift.job_position?.name || 'Shift'}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] opacity-90">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                                  </div>
                                  {!shift.is_published && (
                                    <Badge variant="secondary" className="text-[10px] mt-1">
                                      Draft
                                    </Badge>
                                  )}
                                  {linkedEvents.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {linkedEvents.map((event) => {
                                        const startTime = new Date(event.start);
                                        const timeLabel = Number.isNaN(startTime.getTime())
                                          ? ''
                                          : `${format(startTime, 'HH:mm')} · `;
                                        const isSelected = selectedEventId === event.id;
                                        return (
                                          <button
                                            key={event.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectEvent?.(event.id);
                                            }}
                                            className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                                              isSelected
                                                ? 'border-white bg-white/20 text-white'
                                                : 'border-white/50 bg-white/10 text-white hover:border-white'
                                            }`}
                                          >
                                            {timeLabel}
                                            {event.title || 'Session'}
                                          </button>
                                        );
                                      })}
                                    </div>
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
