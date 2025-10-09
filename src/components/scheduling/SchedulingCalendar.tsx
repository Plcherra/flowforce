import { useState } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { ScheduleHeader } from './ScheduleHeader';
import { ShiftDetailsPanel } from './ShiftDetailsPanel';
import { ViewSelector } from './ViewSelector';
import { SchedulingFilters } from './SchedulingFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { ViewType, Schedule } from '@/types/scheduling-unified';
import { useScheduling } from '@/contexts/SchedulingContext';
import { useEvents } from '@/hooks/useEvents';

interface SchedulingCalendarProps {
  onCreateShift?: () => void;
  hideShiftActions?: boolean;
  externalDetails?: boolean;
  onShiftSelect?: (shiftId: string | null) => void;
}

export function SchedulingCalendar({
  onCreateShift,
  hideShiftActions = false,
  externalDetails = false,
  onShiftSelect,
}: SchedulingCalendarProps = {}) {
  const { shifts, loading } = useScheduling();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<ViewType>(isMobile ? 'day' : 'week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    positions: [],
    users: [],
    status: 'all',
    departments: []
  });

  // Transform raw schedules to match expected interface
  const transformedSchedules = shifts as unknown as Schedule[];

  const { events } = useEvents();
  const overlayEvents = events.filter(e => e.type === 'vendor' || e.type === 'meeting' || e.type === 'event');

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const selectedSchedule = selectedShift ?
    transformedSchedules.find(s => s.id === selectedShift) : null;

  const handleSelectShift = (id: string | null) => {
    setSelectedShift(id);
    if (onShiftSelect) onShiftSelect(id);
  };

  return (
    <div className="space-y-6">
      <ScheduleHeader 
        onPrevDate={() => handleDateChange('prev')}
        onNextDate={() => handleDateChange('next')}
        onToggleFilters={() => setShowFilters(!showFilters)}
        selectedDate={selectedDate}
        currentView={currentView}
        isMobile={isMobile}
        dateRangeText={selectedDate.toDateString()}
        showFilters={showFilters}
        hideToolbar={hideShiftActions}
      />

      <ViewSelector
        currentView={currentView}
        onViewChange={(view: ViewType) => setCurrentView(view)}
        isMobile={isMobile}
      />

      {showFilters && (
        <SchedulingFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}

      <div className={isMobile ? '' : 'flex gap-6'}>
        <div className="flex-1">
          <CalendarGrid
            currentView={currentView}
            schedules={transformedSchedules}
            selectedDate={selectedDate}
            onSelectShift={handleSelectShift}
            filters={filters}
            loading={loading}
            isMobile={isMobile}
            overlayEvents={overlayEvents}
            hideShiftActions={hideShiftActions}
          />
        </div>

        {selectedShift && selectedSchedule && !isMobile && !externalDetails && (
          <div className="w-96">
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={() => handleSelectShift(null)}
            />
          </div>
        )}
      </div>

      {selectedShift && selectedSchedule && isMobile && !externalDetails && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <ShiftDetailsPanel
            shiftId={selectedShift}
            onClose={() => handleSelectShift(null)}
          />
        </div>
      )}
    </div>
  );
}
