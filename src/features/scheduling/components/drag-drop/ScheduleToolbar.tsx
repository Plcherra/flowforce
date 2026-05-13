import { CalendarToolbar } from "../calendar/CalendarToolbar";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

interface ScheduleToolbarProps {
  weekStart: Date;
  selectedDate: Date;
  weekSchedules: ShiftWithAssignments[];
  minimizedView: boolean;
  showDailyInfo: boolean;
  onDateChange: (date: Date) => void;
  onToggleTemplates: () => void;
  onOpenWeekTemplates: () => void;
  onCopyPreviousWeek: () => void;
  onAutoFillWeek: () => void;
  onClearWeek: () => void;
  onPublishWeek: (publish: boolean) => void;
  onExportWeekCsv: () => void;
  onOpenAddShift: () => void;
  onOpenMultiAdd: () => void;
  onOpenImportShifts: () => void;
  onOpenAddUnavailability: () => void;
  onOpenAddTimeOff: () => void;
  onPrintWeek: () => void;
  setMinimizedView: (value: boolean) => void;
  setShowDailyInfo: (value: boolean) => void;
}

export function ScheduleToolbar({
  weekStart,
  selectedDate,
  weekSchedules,
  minimizedView,
  showDailyInfo,
  onDateChange,
  onToggleTemplates,
  onOpenWeekTemplates,
  onCopyPreviousWeek,
  onAutoFillWeek,
  onClearWeek,
  onPublishWeek,
  onExportWeekCsv,
  onOpenAddShift,
  onOpenMultiAdd,
  onOpenImportShifts,
  onOpenAddUnavailability,
  onOpenAddTimeOff,
  onPrintWeek,
  setMinimizedView,
  setShowDailyInfo,
}: ScheduleToolbarProps) {
  return (
    <CalendarToolbar
      weekStart={weekStart}
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      weekSchedules={weekSchedules}
      minimizedView={minimizedView}
      setMinimizedView={setMinimizedView}
      showDailyInfo={showDailyInfo}
      setShowDailyInfo={setShowDailyInfo}
      onToggleTemplates={onToggleTemplates}
      onOpenWeekTemplates={onOpenWeekTemplates}
      onCopyPreviousWeek={onCopyPreviousWeek}
      onAutoFillWeek={onAutoFillWeek}
      onClearWeek={onClearWeek}
      onPublishWeek={onPublishWeek}
      onExportWeekCsv={onExportWeekCsv}
      onPrintWeek={onPrintWeek}
      onOpenAddShift={onOpenAddShift}
      onOpenMultiAdd={onOpenMultiAdd}
      onOpenImportShifts={onOpenImportShifts}
      onOpenAddUnavailability={onOpenAddUnavailability}
      onOpenAddTimeOff={onOpenAddTimeOff}
    />
  );
}
