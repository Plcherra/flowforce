import { CalendarToolbar } from "../calendar/CalendarToolbar";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

interface ScheduleToolbarProps {
  weekSchedules: ShiftWithAssignments[];
  minimizedView: boolean;
  showDailyInfo: boolean;
  onToggleTemplates: () => void;
  onOpenWeekTemplates: () => void;
  onCopyPreviousWeek: () => void;
  onAutoScheduleWeek?: () => void;
  autoScheduleDisabled?: boolean;
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
  readOnly?: boolean;
  onOpenTimeOffPanel?: () => void;
}

export function ScheduleToolbar({
  weekSchedules,
  minimizedView,
  showDailyInfo,
  onToggleTemplates,
  onOpenWeekTemplates,
  onCopyPreviousWeek,
  onAutoScheduleWeek,
  autoScheduleDisabled,
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
  readOnly = false,
  onOpenTimeOffPanel,
}: ScheduleToolbarProps) {
  return (
    <CalendarToolbar
      weekSchedules={weekSchedules}
      minimizedView={minimizedView}
      setMinimizedView={setMinimizedView}
      showDailyInfo={showDailyInfo}
      setShowDailyInfo={setShowDailyInfo}
      onToggleTemplates={onToggleTemplates}
      onOpenWeekTemplates={onOpenWeekTemplates}
      onCopyPreviousWeek={onCopyPreviousWeek}
      onAutoScheduleWeek={onAutoScheduleWeek}
      autoScheduleDisabled={autoScheduleDisabled}
      onClearWeek={onClearWeek}
      onPublishWeek={onPublishWeek}
      onExportWeekCsv={onExportWeekCsv}
      onPrintWeek={onPrintWeek}
      onOpenAddShift={onOpenAddShift}
      onOpenMultiAdd={onOpenMultiAdd}
      onOpenImportShifts={onOpenImportShifts}
      onOpenAddUnavailability={onOpenAddUnavailability}
      onOpenAddTimeOff={onOpenAddTimeOff}
      readOnly={readOnly}
      onOpenTimeOffPanel={onOpenTimeOffPanel}
    />
  );
}
