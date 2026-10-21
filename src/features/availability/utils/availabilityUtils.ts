import type { AvailabilityGrid } from "@/features/availability/components/AvailabilityRequestForm";

export interface StaffAvailabilityRow {
  id: string;
  user_id: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  week_start_date: string | null;
}

export const cloneGrid = (grid: AvailabilityGrid): AvailabilityGrid => {
  const next: AvailabilityGrid = {};
  Object.entries(grid).forEach(([day, hours]) => {
    next[Number(day)] = [...(hours ?? [])];
  });
  return next;
};

const hourFromStoredTime = (value: string) => {
  const isoMatch = value.match(/T(\d{2}):/);
  if (isoMatch) return Number(isoMatch[1]);
  const clockMatch = value.match(/^(\d{1,2}):/);
  if (clockMatch) return Number(clockMatch[1]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getUTCHours();
};

/** staff_availability times are timestamptz, so clock hours need a real date. */
export const availabilityTimestamp = (
  weekStart: string,
  dayOfWeek: number,
  time: string,
) => {
  const [year, month, day] = weekStart.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() + dayOfWeek);
  date.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
  return date.toISOString();
};

export const gridFromAvailabilityRows = (
  rows: StaffAvailabilityRow[],
): AvailabilityGrid => {
  const grid: AvailabilityGrid = {};
  rows.forEach((row) => {
    if (row.day_of_week == null) return;
    const dayIndex = row.day_of_week;
    const startHour = hourFromStoredTime(row.start_time);
    const endHour = hourFromStoredTime(row.end_time);
    if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return;
    const hours: number[] = [];
    for (let hour = startHour; hour < endHour; hour += 1) {
      hours.push(hour);
    }
    grid[dayIndex] = Array.from(
      new Set([...(grid[dayIndex] ?? []), ...hours]),
    ).sort((a, b) => a - b);
  });
  return grid;
};

export const rangesFromGrid = (
  grid: AvailabilityGrid,
): { dayOfWeek: number; startTime: string; endTime: string }[] => {
  const ranges: { dayOfWeek: number; startTime: string; endTime: string }[] =
    [];

  Object.entries(grid).forEach(([day, hours]) => {
    const sorted = [...(hours ?? [])].sort((a, b) => a - b);
    if (sorted.length === 0) return;
    let rangeStart = sorted[0];
    let prev = sorted[0];
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (current !== prev + 1) {
        ranges.push({
          dayOfWeek: Number(day),
          startTime: `${String(rangeStart).padStart(2, "0")}:00`,
          endTime: `${String(prev + 1).padStart(2, "0")}:00`,
        });
        rangeStart = current;
      }
      prev = current;
    }
    ranges.push({
      dayOfWeek: Number(day),
      startTime: `${String(rangeStart).padStart(2, "0")}:00`,
      endTime: `${String(prev + 1).padStart(2, "0")}:00`,
    });
  });

  return ranges;
};

/** Hours 06:00–21:00. rangesFromGrid stores that as 06:00 to 21:00. */
export const FULL_DAY_HOURS = Array.from({ length: 15 }, (_, index) => 6 + index);

export const isFullDayHours = (hours: number[] | undefined) => {
  const sorted = [...(hours ?? [])].sort((a, b) => a - b);
  return (
    sorted.length === FULL_DAY_HOURS.length &&
    FULL_DAY_HOURS.every((hour, index) => sorted[index] === hour)
  );
};

export const hoursFromClockRange = (fromTime: string, toTime: string) => {
  const start = Number(fromTime.slice(0, 2));
  const end = Number(toTime.slice(0, 2));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const hours: number[] = [];
  for (let hour = start; hour < end; hour += 1) hours.push(hour);
  return hours;
};

export const clockRangeFromHours = (hours: number[] | undefined) => {
  const sorted = [...(hours ?? [])].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { fromTime: "09:00", toTime: "17:00" };
  }
  return {
    fromTime: `${String(sorted[0]).padStart(2, "0")}:00`,
    toTime: `${String(sorted[sorted.length - 1] + 1).padStart(2, "0")}:00`,
  };
};

export const hoursDelta = (
  original: AvailabilityGrid,
  desired: AvailabilityGrid,
): number => {
  const sum = (grid: AvailabilityGrid) =>
    Object.values(grid).reduce((acc, hours) => acc + (hours?.length ?? 0), 0);
  return sum(desired) - sum(original);
};

export const computeImpactScore = (
  original: AvailabilityGrid,
  desired: AvailabilityGrid,
): number => {
  const delta = Math.abs(hoursDelta(original, desired));
  return Math.min(100, delta * 8);
};
