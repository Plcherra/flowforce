export const TERMINAL_TIME_OFF_STATUSES = new Set([
  "rejected",
  "denied",
  "cancelled",
]);

export const SCHEDULE_DAY_START_MINUTES = 6 * 60;
export const SCHEDULE_DAY_END_MINUTES = 21 * 60;

export function dateValue(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateOnlyStart(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateOnlyEnd(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function rangesOverlap(
  leftStart: Date | null,
  leftEnd: Date | null,
  rightStart: Date | null,
  rightEnd: Date | null,
) {
  if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false;
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfIsoWeek(date: Date): Date {
  const result = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

export function isoWeekStartForDate(date: Date) {
  return toIsoDate(startOfIsoWeek(date));
}

/** Monday = 0 … Sunday = 6 (matches staff availability grid). */
export function dayOfWeekIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return 0;
  if (value.includes("T")) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours() * 60 + parsed.getMinutes();
    }
  }
  const [hourPart, minutePart] = value.split(":");
  const hours = Number.parseInt(hourPart ?? "0", 10);
  const minutes = Number.parseInt(minutePart ?? "0", 10);
  return hours * 60 + minutes;
}

export function minutesToTimeLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "p" : "a";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  if (minutes === 0) {
    return `${hour12}${period}`;
  }
  return `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
}

export function formatHintUntil(endMinutes: number) {
  return `Until ${minutesToTimeLabel(endMinutes)}`;
}

export function minutesToHHmm(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function calendarDayWithinRange(
  day: Date,
  rangeStart: Date | null,
  rangeEnd: Date | null,
) {
  if (!rangeStart || !rangeEnd) return false;
  const dayStart = dateOnlyStart(toIsoDate(day));
  const dayEnd = dateOnlyEnd(toIsoDate(day));
  if (!dayStart || !dayEnd) return false;
  return rangesOverlap(dayStart, dayEnd, rangeStart, rangeEnd);
}

export function shiftFitsWindows(
  shiftStartMinutes: number,
  shiftEndMinutes: number,
  windows: { start: string; end: string }[],
) {
  return windows.some((window) => {
    const windowStart = parseTimeToMinutes(window.start);
    const windowEnd = parseTimeToMinutes(window.end);
    return shiftStartMinutes >= windowStart && shiftEndMinutes <= windowEnd;
  });
}
