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

export const gridFromAvailabilityRows = (
  rows: StaffAvailabilityRow[],
): AvailabilityGrid => {
  const grid: AvailabilityGrid = {};
  rows.forEach((row) => {
    if (row.day_of_week == null) return;
    const dayIndex = row.day_of_week;
    const startHour = Number(row.start_time.split(":")[0]);
    const endHour = Number(row.end_time.split(":")[0]);
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
