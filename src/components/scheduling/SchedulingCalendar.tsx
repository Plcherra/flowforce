import { useState } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { ScheduleHeader } from './ScheduleHeader';
import { ShiftDetailsPanel } from './ShiftDetailsPanel';
import { ViewSelector } from './ViewSelector';
import { SchedulingFilters } from './SchedulingFilters';
import { useSchedules } from '@/hooks/scheduling/useSchedules';
import { useIsMobile } from '@/hooks/use-mobile';
import { ViewType, Schedule } from '@/types/scheduling-unified';
import { useScheduling } from '@/contexts/SchedulingContext';

interface SchedulingCalendarProps {
  onCreateShift?: () => void;
}

export function SchedulingCalendar({ onCreateShift }: SchedulingCalendarProps = {}) {
  const { schedules, loading } = useScheduling();
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
  const transformedSchedules: Schedule[] = schedules;

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
            schedules={transformedSchedules as any}
            selectedDate={selectedDate}
            onSelectShift={setSelectedShift}
            filters={filters}
            loading={loading}
            isMobile={isMobile}
          />
        </div>

        {selectedShift && selectedSchedule && !isMobile && (
          <div className="w-96">
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={() => setSelectedShift(null)}
            />
          </div>
        )}
      </div>

      {selectedShift && selectedSchedule && isMobile && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <ShiftDetailsPanel
            shiftId={selectedShift}
            onClose={() => setSelectedShift(null)}
          />
        </div>
      )}
    </div>
  );
}