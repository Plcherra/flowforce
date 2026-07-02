import {
  addDays,
  differenceInMinutes,
  format,
  startOfMonth,
  differenceInWeeks,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

type CalendarToolbarProps = {
  weekStart: Date;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  weekSchedules: any[];
  minimizedView: boolean;
  setMinimizedView: (v: boolean) => void;
  showDailyInfo: boolean;
  setShowDailyInfo: (v: boolean) => void;
  onToggleTemplates: () => void;
  onOpenWeekTemplates: () => void;
  onCopyPreviousWeek: () => void;
  onAutoScheduleWeek?: () => void;
  autoScheduleDisabled?: boolean;
  onClearWeek: () => void;
  onPublishWeek: (published: boolean) => void;
  onExportWeekCsv: () => void;
  onPrintWeek: () => void;
  onOpenAddShift: () => void;
  onOpenMultiAdd: () => void;
  onOpenImportShifts: () => void;
  onOpenAddUnavailability: () => void;
  onOpenAddTimeOff: () => void;
  readOnly?: boolean;
  onOpenTimeOffPanel?: () => void;
};

export function CalendarToolbar({
  weekStart,
  selectedDate,
  onDateChange,
  weekSchedules,
  minimizedView,
  setMinimizedView,
  showDailyInfo,
  setShowDailyInfo,
  onToggleTemplates,
  onOpenWeekTemplates,
  onCopyPreviousWeek,
  onAutoScheduleWeek,
  autoScheduleDisabled = false,
  onClearWeek,
  onPublishWeek,
  onExportWeekCsv,
  onPrintWeek,
  onOpenAddShift,
  onOpenMultiAdd,
  onOpenImportShifts,
  onOpenAddUnavailability,
  onOpenAddTimeOff,
  readOnly = false,
  onOpenTimeOffPanel,
}: CalendarToolbarProps) {
  const uniqueUsers = new Set<string>();
  let totalMinutes = 0;
  weekSchedules.forEach((s: any) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    totalMinutes += Math.max(0, differenceInMinutes(end, start));
    (s.assignments || []).forEach((a: any) => uniqueUsers.add(a.user_id));
  });
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Calculate which week of the month we're in
  const monthStart = startOfMonth(weekStart);
  const weekNumber = Math.floor(differenceInWeeks(weekStart, monthStart)) + 1;
  const monthName = format(weekStart, "MMM");

  return (
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addDays(selectedDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Week {weekNumber} of {monthName}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addDays(selectedDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{weekSchedules.length} shifts</Badge>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hours {totalHours}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {uniqueUsers.size}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                View options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Display</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={minimizedView}
                onCheckedChange={setMinimizedView}
              >
                Minimized view
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showDailyInfo}
                onCheckedChange={setShowDailyInfo}
              >
                Daily info
              </DropdownMenuCheckboxItem>
              {!readOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Templates</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onToggleTemplates}>
                    Toggle role templates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenWeekTemplates}>
                    Open week templates
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {readOnly ? (
            onOpenTimeOffPanel ? (
              <Button variant="outline" size="sm" onClick={onOpenTimeOffPanel}>
                Request time off
              </Button>
            ) : null
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={onCopyPreviousWeek}>
                    Copy previous week
                  </DropdownMenuItem>
                  {onAutoScheduleWeek ? (
                    <DropdownMenuItem
                      onClick={onAutoScheduleWeek}
                      disabled={autoScheduleDisabled}
                      className="text-muted-foreground"
                    >
                      Auto-schedule week
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={onClearWeek}>
                    Clear week
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onPublishWeek(true)}>
                    Publish week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPublishWeek(false)}>
                    Unpublish week
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onExportWeekCsv}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPrintWeek}>
                    Print week
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenWeekTemplates}>
                    Week templates
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">Add</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem onClick={onOpenAddShift}>
                    Add single shift
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenMultiAdd}>
                    Add multiple shifts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenImportShifts}>
                    Import shifts from Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenAddUnavailability}>
                    Add unavailability
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenAddTimeOff}>
                    Add time off
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </CardTitle>
    </CardHeader>
  );
}
