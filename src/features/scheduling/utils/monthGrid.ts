import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

/** Sunday-start grid that includes the padding days before and after the month. */
export function monthGridRange(month: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  };
}
