import { differenceInMinutes } from "date-fns";
import { ScheduleWeekDesk } from "@/features/scheduling/components/calendar/ScheduleWeekDesk";
import { formatCount } from "@/features/scheduling/utils/pluralize";

type CalendarToolbarProps = {
  weekSchedules: any[];
  minimizedView: boolean;
  setMinimizedView: (v: boolean) => void;
  showDailyInfo: boolean;
  setShowDailyInfo: (v: boolean) => void;
  showAvailabilityLayer?: boolean;
  setShowAvailabilityLayer?: (v: boolean) => void;
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
  smartFillOpen?: boolean;
  onToggleSmartFill?: () => void;
};

export function CalendarToolbar(props: CalendarToolbarProps) {
  const { weekSchedules } = props;
  const uniqueUsers = new Set<string>();
  let totalMinutes = 0;
  weekSchedules.forEach((schedule: any) => {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    totalMinutes += Math.max(0, differenceInMinutes(end, start));
    (schedule.assignments || []).forEach((assignment: any) =>
      uniqueUsers.add(assignment.user_id),
    );
  });
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const summary = `${formatCount(weekSchedules.length, "shift")} · ${totalHours} hrs · ${uniqueUsers.size} people`;

  return <ScheduleWeekDesk {...props} summary={summary} />;
}
