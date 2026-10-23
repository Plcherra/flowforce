import type { ChecklistArea } from "@/features/forms/utils/checklistForms";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type StoreStation = "front_of_house" | "back_of_house";

export type ShiftWeekdayTask = {
  title: string;
  area: ChecklistArea;
  weekdays: Weekday[];
  slot: null;
  stations: StoreStation[];
};

export const US_FOODS_DELIVERY: ShiftWeekdayTask = {
  title: "Organize the US Foods delivery",
  area: "supervisor",
  weekdays: ["mon", "wed", "fri"],
  slot: null,
  stations: ["front_of_house", "back_of_house"],
};

export function matchesWeekday(task: ShiftWeekdayTask, weekday: Weekday): boolean {
  return task.weekdays.includes(weekday);
}

export function readShiftWeekdayTask(links: unknown): ShiftWeekdayTask | null {
  if (!links || typeof links !== "object" || Array.isArray(links)) return null;
  const raw = (links as Record<string, unknown>).shiftWeekdayTask;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.slot !== null) return null;
  if (record.area !== "cashier" && record.area !== "supervisor") return null;
  if (typeof record.title !== "string" || !record.title.trim()) return null;
  if (!Array.isArray(record.weekdays) || !Array.isArray(record.stations)) return null;
  const weekdays = record.weekdays.filter(isWeekday);
  const stations = record.stations.filter(isStation);
  if (weekdays.length !== record.weekdays.length) return null;
  if (stations.length !== record.stations.length || stations.length === 0) return null;
  return {
    title: record.title,
    area: record.area,
    weekdays,
    slot: null,
    stations,
  };
}

export function withShiftWeekdayTask(
  links: unknown,
  task: ShiftWeekdayTask,
): Record<string, unknown> {
  const base =
    links && typeof links === "object" && !Array.isArray(links)
      ? { ...(links as Record<string, unknown>) }
      : {};
  base.shiftWeekdayTask = task;
  return base;
}

function isWeekday(value: unknown): value is Weekday {
  return WEEKDAYS.includes(value as Weekday);
}

function isStation(value: unknown): value is StoreStation {
  return value === "front_of_house" || value === "back_of_house";
}
