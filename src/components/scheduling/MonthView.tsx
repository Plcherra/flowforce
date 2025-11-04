
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { ShiftWithAssignments } from '@/hooks/scheduling/useSchedulingConsolidated';
import type { SchedulingFilterState } from './SchedulingFilters';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useMemo, useState } from 'react';
import { ShiftWizardDialog } from './ShiftWizardDialog';

interface MonthViewProps {
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

export function MonthView({
  schedules,
  selectedDate,
  onSelectShift,
  onSelectEvent,
  filters: _filters,
  isMobile = false,
  hideShiftActions = false,
  overlayEvents = [],
  selectedEventId = null,
}: MonthViewProps) {
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

  const getEventsForDay = useMemo(
    () => (day: Date) =>
      overlayEvents
        .filter((event) => isSameDay(new Date(event.start), day))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
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
            const dayEvents = getEventsForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] border border-gray-200 p-1 bg-white hover:bg-gray-50"
              >
                <div className="text-xs font-medium text-gray-900 mb-1">
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-[10px] p-1 rounded border border-border/60 bg-background cursor-pointer ${
                        selectedEventId === event.id ? 'ring-1 ring-primary' : ''
                      }`}
                      onClick={() => handleEventClick(event.id)}
                    >
                      <div className="font-medium truncate">{event.title || 'Session'}</div>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-gray-500">
                      +{dayEvents.length - 2} sessions
                    </div>
                  )}
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
          const dayEvents = getEventsForDay(day);
          
          return (
            <div
              key={day.toISOString()}
              className="min-h-[120px] border border-gray-200 p-2 bg-white hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 mb-2">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between rounded border border-border/70 bg-background px-2 py-1 text-[11px] cursor-pointer ${
                      selectedEventId === event.id ? 'ring-1 ring-primary' : ''
                    }`}
                    onClick={() => handleEventClick(event.id)}
                  >
                    <div className="truncate">
                      <span className="font-medium">{event.title || 'Session'}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {format(new Date(event.start), 'HH:mm')}
                      </span>
                    </div>
                    {event.type && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {event.type}
                      </Badge>
                    )}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 3} more sessions
                  </div>
                )}

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

              {/* Quick add button (hidden for events-only calendar) */}
              {!hideShiftActions && (
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
              )}
            </div>
          );
        })}
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
