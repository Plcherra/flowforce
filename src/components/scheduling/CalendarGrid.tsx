
import { Card, CardContent } from '@/components/ui/card';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import type { SchedulingFilterState } from './SchedulingFilters';
import type { ShiftWithAssignments } from '@/hooks/scheduling/useSchedulingConsolidated';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

type ViewType = 'month' | 'week' | 'day' | 'year';

interface CalendarGridProps {
  currentView: ViewType;
  schedules: ShiftWithAssignments[];
  selectedDate: Date;
  onSelectShift: (shiftId: string) => void;
  onSelectEvent?: (eventId: string | null) => void;
  filters: SchedulingFilterState;
  loading: boolean;
  isMobile?: boolean;
  overlayEvents?: CalendarEvent[];
  hideShiftActions?: boolean;
  selectedEventId?: string | null;
}

export function CalendarGrid({
  currentView,
  schedules,
  selectedDate,
  onSelectShift,
  onSelectEvent,
  filters,
  loading,
  isMobile = false,
  overlayEvents,
  hideShiftActions = false,
  selectedEventId = null
}: CalendarGridProps) {
  const renderCalendarView = () => {
    const commonProps = {
      schedules,
      selectedDate,
      onSelectShift,
      onSelectEvent,
      filters,
      isMobile,
      overlayEvents,
      hideShiftActions,
      selectedEventId
    };

    switch (currentView) {
      case 'week':
        return <WeekView {...commonProps} />;
      case 'month':
        return <MonthView {...commonProps} />;
      case 'day':
        return <DayView {...commonProps} />;
      default:
        return <WeekView {...commonProps} />;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading schedule...</p>
            </div>
          </div>
        ) : (
          renderCalendarView()
        )}
      </CardContent>
    </Card>
  );
}
