import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Filter,
  Plus,
  Settings,
  Users,
  Briefcase,
} from "lucide-react";
import { PositionManagementDialog } from "@/components/positions/PositionManagementDialog";
import { UserPositionAssignment } from "@/components/positions/UserPositionAssignment";
import { ShiftWizardDialog } from "./ShiftWizardDialog";

interface EnhancedScheduleHeaderProps {
  dateRangeText: string;
  showFilters: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToggleFilters: () => void;
  selectedDate: Date;
  currentView: string;
  isMobile?: boolean;
  totalShifts?: number;
  publishedShifts?: number;
  totalHours?: number;
}

export function EnhancedScheduleHeader({
  dateRangeText,
  showFilters,
  onPrevDate,
  onNextDate,
  onToggleFilters,
  selectedDate,
  currentView,
  isMobile = false,
  totalShifts = 0,
  publishedShifts = 0,
  totalHours = 0,
}: EnhancedScheduleHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4">
          <div className="mb-2 lg:mb-0">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">
              Schedule Management
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              {dateRangeText}
            </p>
          </div>

          {/* Stats - Stack on mobile, row on desktop */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
              <CalendarDays className="h-3 w-3" />
              {totalShifts} shifts
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
              {publishedShifts}/{totalShifts} published
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
              {totalHours}h scheduled
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={onToggleFilters}
            className="flex-1 lg:flex-initial"
          >
            <Filter className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">
              {showFilters ? "Hide" : "Show"} Filters
            </span>
          </Button>

          <ShiftWizardDialog selectedDate={selectedDate}>
            <Button
              size={isMobile ? "sm" : "sm"}
              className="flex-1 lg:flex-initial"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add Shift</span>
            </Button>
          </ShiftWizardDialog>
        </div>
      </div>

      {/* Management Actions - Responsive grid */}
      <div className="grid grid-cols-2 lg:flex gap-2">
        <PositionManagementDialog>
          <Button variant="outline" size="sm" className="w-full lg:w-auto">
            <Briefcase className="h-4 w-4 lg:mr-2" />
            <span className="text-xs lg:text-sm">Positions</span>
          </Button>
        </PositionManagementDialog>

        <UserPositionAssignment>
          <Button variant="outline" size="sm" className="w-full lg:w-auto">
            <Users className="h-4 w-4 lg:mr-2" />
            <span className="text-xs lg:text-sm">Assign Staff</span>
          </Button>
        </UserPositionAssignment>

        <Button
          variant="outline"
          size="sm"
          className="col-span-2 lg:col-span-1 lg:w-auto"
        >
          <Settings className="h-4 w-4 lg:mr-2" />
          <span className="text-xs lg:text-sm">Settings</span>
        </Button>
      </div>

      {/* Navigation - Full width on mobile */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevDate}
          className="flex-1 lg:flex-initial"
        >
          Previous {currentView}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextDate}
          className="flex-1 lg:flex-initial"
        >
          Next {currentView}
        </Button>
      </div>
    </div>
  );
}
