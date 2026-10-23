import type { ChecklistArea } from "@/features/forms/utils/checklistForms";
import {
  WEEKDAYS,
  withShiftWeekdayTask,
  type ShiftWeekdayTask,
  type StoreStation,
  type Weekday,
} from "./shiftWeekdayTask";

export function weekdayTaskRecord(input: {
  title: string;
  area: ChecklistArea;
  weekdays: readonly Weekday[];
  stations: readonly StoreStation[];
}): ShiftWeekdayTask | null {
  const title = input.title.trim();
  const weekdays = WEEKDAYS.filter((day) => input.weekdays.includes(day));
  const stations = (["front_of_house", "back_of_house"] as const).filter((station) =>
    input.stations.includes(station),
  );
  if (!title || weekdays.length === 0 || stations.length === 0) return null;
  return { title, area: input.area, weekdays, slot: null, stations };
}

export function weekdayTaskInsert(task: ShiftWeekdayTask, userId: string) {
  return {
    title: task.title,
    status: "todo" as const,
    source: "schedule" as const,
    priority: "medium" as const,
    created_by: userId,
    assigned_to: null,
    links: withShiftWeekdayTask({}, task),
  };
}
