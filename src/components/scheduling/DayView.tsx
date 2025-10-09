
import { format, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Clock, Users, Plus } from 'lucide-react';
import { Schedule, SchedulingFilters, ScheduleAssignment } from '@/types/common';
import { useState } from 'react';
import { ShiftWizardDialog } from './ShiftWizardDialog';
import { getShiftColor } from '@/utils/schedulingUtils';

interface DayViewProps {
  schedules: Schedule[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  filters: SchedulingFilters;
  isMobile?: boolean;
  hideShiftActions?: boolean;
}

export function DayView({ schedules, selectedDate, onSelectShift, filters, isMobile = false, hideShiftActions = false }: DayViewProps) {
  const [showAddShift, setShowAddShift] = useState(false);
  const dayShifts = schedules.filter(schedule => 
    isSameDay(parseISO(schedule.start_time), selectedDate)
  );


  return (
    <div className={`p-${isMobile ? '4' : '6'}`}>
      <div className={`mb-${isMobile ? '4' : '6'}`}>
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
          {format(selectedDate, isMobile ? 'EEE, MMM d' : 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-gray-600">
          {dayShifts.length} shifts scheduled
        </p>
      </div>

      <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} gap-${isMobile ? '4' : '6'}`}>
        {/* Time-based view */}
        <div>
          <h3 className="flex items-center text-lg font-semibold mb-4">
            <Users className="h-5 w-5 mr-2" />
            Staff Timeline
          </h3>
          <div className="space-y-4">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourShifts = dayShifts.filter(shift => {
                const startHour = new Date(shift.start_time).getHours();
                const endHour = new Date(shift.end_time).getHours();
                return hour >= startHour && hour < endHour;
              });

              // Get all users working during this hour
              const hourlyUsers = new Set<string>();
              hourShifts.forEach(shift => {
                if (shift.assignments) {
                  shift.assignments.forEach((assignment: ScheduleAssignment) => {
                    if (assignment.user) {
                      hourlyUsers.add(`${assignment.user.first_name} ${assignment.user.last_name}`);
                    }
                  });
                }
              });

              const userList = Array.from(hourlyUsers);

              return (
                <div key={hour} className="flex items-start border-l-2 border-gray-200 pl-4 min-h-[60px]">
                  <div className="w-16 text-sm text-gray-500 font-medium">
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                  <div className="flex-1 ml-4">
                    {userList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {userList.map((userName, index) => (
                          <div key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {userName}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">No staff scheduled</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift list */}
        <div>
          <h3 className="text-lg font-semibold mb-4">All Shifts</h3>
          {dayShifts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h4>
              {!hideShiftActions && (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Add shifts for {format(selectedDate, 'MMMM d')} to get started
                  </p>
                  <Button onClick={() => setShowAddShift(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Shift
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayShifts.map(shift => (
                <div
                  key={shift.id}
                  className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectShift(shift.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {shift.title || shift.job_position?.name || 'Shift'}
                    </h4>
                    <Badge
                      style={{ backgroundColor: getShiftColor(shift), color: 'white' }}
                    >
                      {shift.job_position?.role || 'Staff'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="font-medium">Time:</span>
                      </div>
                      <div className="ml-5">
                        {format(new Date(shift.start_time), 'HH:mm')} - 
                        {format(new Date(shift.end_time), 'HH:mm')}
                      </div>
                      {shift.location && (
                        <div className="ml-5 text-gray-500">
                          📍 {shift.location}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center mb-1">
                        <Users className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          Staff ({shift.assignments?.length || 0}/{shift.required_headcount || 1}):
                        </span>
                      </div>
                      {shift.assignments && shift.assignments.length > 0 ? (
                        <div className="ml-5 flex -space-x-1">
                          {shift.assignments?.slice(0, 5).map((assignment: ScheduleAssignment) => (
                            <Avatar key={assignment.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={assignment.user?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {assignment.user?.first_name?.[0]}
                                {assignment.user?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {shift.assignments.length > 5 && (
                            <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white text-xs flex items-center justify-center">
                              +{shift.assignments.length - 5}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="ml-5 text-gray-400 italic">No staff assigned</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Badge variant={shift.is_published ? "default" : "secondary"}>
                      {shift.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Centralized Add Shift Dialog */}
      {!hideShiftActions && (
        <ShiftWizardDialog open={showAddShift} onOpenChange={setShowAddShift} selectedDate={selectedDate} />
      )}
    </div>
  );
}
