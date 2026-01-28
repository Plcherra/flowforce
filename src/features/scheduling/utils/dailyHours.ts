/**
 * Utility functions for daily hours processing
 */

import { parseISO, format } from "date-fns";

/**
 * Format daily hours label
 */
function formatDailyHoursLabel(day: string, parsedDate?: Date): string {
  const date = parsedDate ?? parseISO(day);
  if (Number.isNaN(date.getTime())) {
    return day;
  }
  return format(date, "EEE, MMM d");
}

export interface DailyHourEntry {
  day: string;
  hours: number;
  parsedDate: Date;
  label: string;
}

/**
 * Convert daily hours record to sorted entries
 */
export function processDailyHours(
  dailyHours: Record<string, number>,
): DailyHourEntry[] {
  return Object.entries(dailyHours)
    .map(([day, hours]) => {
      const parsedDate = parseISO(day);
      const timestamp = parsedDate.getTime();
      if (Number.isNaN(timestamp)) {
        return null;
      }

      return {
        day,
        hours,
        parsedDate,
        label: formatDailyHoursLabel(day, parsedDate),
      };
    })
    .filter((entry): entry is DailyHourEntry => entry !== null)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
}
