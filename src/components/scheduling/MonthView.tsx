
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Schedule, SchedulingFilters } from '@/types/common';
import { useState } from 'react';
import { AddShiftDialog } from './AddShiftDialog';

interface MonthViewProps {
  schedules: Schedule[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  filters: SchedulingFilters;
  isMobile?: boolean;
}

export function MonthView({ schedules, selectedDate, onSelectShift, filters, isMobile = false }: MonthViewProps) {
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getShiftsForDay = (day: Date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.start_time), day)
    );
  };

  if (isMobile) {
    return (
      <div className="p-2">
        {/* Mobile Calendar Grid - Smaller cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {monthDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] border border-gray-200 p-1 bg-white hover:bg-gray-50"
              >
                <div className="text-xs font-medium text-gray-900 mb-1">
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map(shift => (
                    <div
                      key={shift.id}
                      className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow"
                      style={{ backgroundColor: shift.color || '#3b82f6', color: 'white' }}
                      onClick={() => onSelectShift(shift.id)}
                    >
                      <div className="font-medium truncate text-xs">
                        {shift.title?.substring(0, 8) || 'Shift'}
                      </div>
                    </div>
                  ))}
                  
                  {dayShifts.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayShifts.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {monthDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          
          return (
            <div
              key={day.toISOString()}
              className="min-h-[120px] border border-gray-200 p-2 bg-white hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 mb-2">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayShifts.slice(0, 3).map(shift => (
                  <div
                    key={shift.id}
                    className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: shift.color || '#3b82f6', color: 'white' }}
                    onClick={() => onSelectShift(shift.id)}
                  >
                    <div className="font-medium truncate">
                      {shift.title || 'Shift'}
                    </div>
                    <div className="opacity-90">
                      {format(new Date(shift.start_time), 'HH:mm')}
                    </div>
                  </div>
                ))}
                
                {dayShifts.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayShifts.length - 3} more
                  </div>
                )}
              </div>

              {/* Quick add button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-6 text-xs opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => {
                  setQuickAddDate(day);
                  setShowAddShift(true);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
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
