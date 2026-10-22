import {
  FULL_DAY_HOURS,
  hoursFromClockRange,
  isFullDayHours,
} from "@/features/availability/utils/availabilityUtils";

export type DayAvailabilityState = "all_day" | "unavailable" | "set_hours";

export function dayAvailabilityState(hours: number[] | undefined): DayAvailabilityState {
  if (!hours || hours.length === 0) return "unavailable";
  if (isFullDayHours(hours)) return "all_day";
  return "set_hours";
}

export function hoursForDayState(
  state: DayAvailabilityState,
  fromTime: string,
  toTime: string,
): number[] {
  if (state === "all_day") return [...FULL_DAY_HOURS];
  if (state === "unavailable") return [];
  return hoursFromClockRange(fromTime, toTime);
}

export function hoursAfterTimeEdit(fromTime: string, toTime: string): number[] {
  return hoursFromClockRange(fromTime, toTime);
}
