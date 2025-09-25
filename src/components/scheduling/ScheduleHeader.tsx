
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { SchedulingToolbar } from './SchedulingToolbar';
import { useCan } from '@/hooks/useCan';

interface ScheduleHeaderProps {
  dateRangeText: string;
  showFilters: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToggleFilters: () => void;
  selectedDate: Date;
  currentView: string;
  isMobile?: boolean;
}

export function ScheduleHeader({
  dateRangeText,
  showFilters,
  onPrevDate,
  onNextDate,
  onToggleFilters,
  selectedDate,
  currentView,
  isMobile = false
}: ScheduleHeaderProps) {
  const { can } = useCan();

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onPrevDate}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNextDate}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <span className="text-sm font-medium text-center flex-1 mx-4">
            {dateRangeText}
          </span>
          
          {can('editSchedules') && (
            <SchedulingToolbar 
              selectedDate={selectedDate}
              currentView={currentView}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onPrevDate}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {dateRangeText}
          </span>
          <Button variant="outline" size="sm" onClick={onNextDate}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={onToggleFilters}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        {can('editSchedules') && (
          <SchedulingToolbar 
            selectedDate={selectedDate}
            currentView={currentView}
          />
        )}
      </div>
    </div>
  );
}
