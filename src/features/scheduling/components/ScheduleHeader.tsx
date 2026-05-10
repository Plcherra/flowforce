import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { SchedulingToolbar } from "./SchedulingToolbar";
import { useCan } from "@/hooks/useCan";

type ScheduleMode = "scheduling" | "events";

interface ScheduleHeaderProps {
  dateRangeText: string;
  showFilters: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToggleFilters?: () => void;
  selectedDate: Date;
  currentView: string;
  isMobile?: boolean;
  hideToolbar?: boolean;
  mode?: ScheduleMode;
}

export function ScheduleHeader({
  dateRangeText,
  showFilters,
  onPrevDate,
  onNextDate,
  onToggleFilters,
  selectedDate,
  currentView,
  isMobile = false,
  hideToolbar = false,
  mode = "scheduling",
}: ScheduleHeaderProps) {
  const { can } = useCan();
  const isScheduling = mode === "scheduling";
  const heading = isScheduling ? "Schedule" : "Events Calendar";
  const filtersEnabled = isScheduling && Boolean(onToggleFilters);
  const filtersActive = filtersEnabled && showFilters;
  const shouldShowToolbar =
    isScheduling && !hideToolbar && can("editSchedules");

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          {filtersEnabled && (
            <Button
              variant={filtersActive ? "default" : "outline"}
              size="sm"
              onClick={onToggleFilters}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
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

          {shouldShowToolbar && (
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
        <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
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
        {filtersEnabled && (
          <Button
            variant={filtersActive ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        )}
        {shouldShowToolbar && (
          <SchedulingToolbar
            selectedDate={selectedDate}
            currentView={currentView}
          />
        )}
      </div>
    </div>
  );
}
