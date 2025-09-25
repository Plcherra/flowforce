
import { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Clock, Users, Plus } from 'lucide-react';
import { Schedule, SchedulingFilters, ScheduleAssignment } from '@/types/common';
import { AddShiftDialog } from './AddShiftDialog';
import { getShiftColor, getHourlyUsers, calculateCoverageStats, UserProfile } from '@/utils/schedulingUtils';

interface WeekViewProps {
  schedules: Schedule[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  filters: SchedulingFilters;
  isMobile?: boolean;
}

export function WeekView({ schedules, selectedDate, onSelectShift, filters, isMobile = false }: WeekViewProps) {
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = (day: Date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.start_time), day)
    );
  };

  const getCoverageStats = useMemo(() => (day: Date) => {
    const dayShifts = getShiftsForDay(day);
    return calculateCoverageStats(dayShifts);
  }, [schedules]);

  if (isMobile) {
    // Mobile: Show simplified horizontal scrollable week view
    return (
      <div className="space-y-4">
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
            if (dayShifts.length === 0) return null;
            
            return (
              <div key={day.toISOString()} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {format(day, 'EEEE, MMM d')}
                </h3>
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
                          {shift.assignments?.slice(0, 3).map((assignment: ScheduleAssignment) => (
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots and shifts */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 min-h-[600px]">
          {/* Employees column */}
          <div className="border-r bg-muted/30">
            {/* Get unique employees who have shifts this week */}
            {(() => {
              const employeeMap = new Map();
              
              // Collect all employees from all shifts this week
              weekDays.forEach(day => {
                const dayShifts = getShiftsForDay(day);
                dayShifts.forEach(shift => {
                  if (shift.assignments && shift.assignments.length > 0) {
                    shift.assignments.forEach((assignment: ScheduleAssignment) => {
                      if (assignment.user) {
                        const userId = assignment.user.id || `${assignment.user.first_name}-${assignment.user.last_name}`;
                        employeeMap.set(userId, {
                          id: assignment.user.id || userId,
                          first_name: assignment.user.first_name || 'Unknown',
                          last_name: assignment.user.last_name || 'Employee',
                          avatar_url: assignment.user.avatar_url
                        });
                      }
                    });
                  } else {
                    // Show unassigned shifts as "Unassigned"
                    employeeMap.set('unassigned', {
                      id: 'unassigned',
                      first_name: 'Unassigned',
                      last_name: 'Shifts',
                      avatar_url: null
                    });
                  }
                });
              });
              
              const employees = Array.from(employeeMap.values());
              
              return employees.map((employee) => (
                <div key={employee.id} className="h-16 border-b border-border p-3 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={employee.avatar_url} />
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
              ));
            })()}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="border-r">
              {(() => {
                // Get unique employees for consistent row mapping
                const employeeMap = new Map();
                weekDays.forEach(weekDay => {
                  const dayShifts = getShiftsForDay(weekDay);
                  dayShifts.forEach(shift => {
                    if (shift.assignments && shift.assignments.length > 0) {
                      shift.assignments.forEach((assignment: ScheduleAssignment) => {
                        if (assignment.user) {
                          const userId = assignment.user.id || `${assignment.user.first_name}-${assignment.user.last_name}`;
                          employeeMap.set(userId, {
                            id: assignment.user.id || userId,
                            first_name: assignment.user.first_name || 'Unknown',
                            last_name: assignment.user.last_name || 'Employee',
                            avatar_url: assignment.user.avatar_url
                          });
                        }
                      });
                    } else {
                      employeeMap.set('unassigned', {
                        id: 'unassigned',
                        first_name: 'Unassigned',
                        last_name: 'Shifts',
                        avatar_url: null
                      });
                    }
                  });
                });
                const employees = Array.from(employeeMap.values());
                
                return employees.map((employee) => {
                  // Get shifts for this employee on this day
                  const employeeShifts = getShiftsForDay(day).filter(shift => {
                    if (employee.id === 'unassigned') {
                      return !shift.assignments || shift.assignments.length === 0;
                    }
                    return shift.assignments?.some((assignment: ScheduleAssignment) => 
                      assignment.user && (assignment.user.id === employee.id || 
                      `${assignment.user.first_name}-${assignment.user.last_name}` === employee.id)
                    );
                  });
                  
                  return (
                    <div key={`${day.toISOString()}-${employee.id}`} className="h-16 border-b border-gray-100 p-1 relative">
                      {employeeShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-1 p-2 text-white text-xs"
                          style={{
                            backgroundColor: getShiftColor(shift),
                            opacity: shift.is_published ? 1 : 0.7
                          }}
                          onClick={() => onSelectShift(shift.id)}
                        >
                          <div className="font-medium truncate mb-1">
                            {shift.title || shift.job_position?.name || 'Shift'}
                          </div>
                          <div className="flex items-center gap-1 text-xs opacity-90">
                            <Clock className="h-3 w-3" />
                            {format(new Date(shift.start_time), 'HH:mm')} - 
                            {format(new Date(shift.end_time), 'HH:mm')}
                          </div>
                          {!shift.is_published && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Draft
                            </Badge>
                          )}
                        </div>
                      ))}
                      
                      {employeeShifts.length === 0 && employee.id !== 'unassigned' && (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400">
                          {/* Empty cell for employees with no shifts */}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>
      {/* Centralized Add Shift Dialog */}
      <AddShiftDialog
        open={showAddShift}
        onOpenChange={(open) => {
          setShowAddShift(open);
          if (!open) setQuickAddDate(null);
        }}
        selectedDate={quickAddDate || selectedDate}
      />
    </div>
  );
}
