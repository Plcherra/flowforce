import { isSameDay } from "date-fns";
import { dayIso } from "@/features/scheduling/utils/gridIndexes";
import { vendorEventStart } from "@/features/scheduling/utils/calendarDay";

export interface DatedShift {
  id: string;
  start: Date;
}

export function chosenShiftIds(event: {
  related_shift_ids?: string[] | null;
  shift_id?: string | null;
}): string[] {
  const related = [...new Set((event.related_shift_ids ?? []).filter(Boolean))];
  if (related.length > 0) return related;
  return event.shift_id ? [event.shift_id] : [];
}

/**
 * An event belongs to its own calendar day.
 * Chosen shifts limit the marker to those shifts when they still fall on that day.
 * With no choice, the marker shows on every shift that day.
 * With no matching shift, it shows once for the day.
 */
export function placeEventsOnDayShifts<T>(params: {
  events: T[];
  shifts: DatedShift[];
  days: Date[];
  eventStart: (event: T) => Date | null;
  chosenShiftIds: (event: T) => string[];
}): { byShift: Map<string, T[]>; looseByDay: Map<string, T[]> } {
  const uniqueShifts = new Map<string, DatedShift>();
  for (const shift of params.shifts) {
    if (!shift.id || Number.isNaN(shift.start.getTime())) continue;
    if (!uniqueShifts.has(shift.id)) uniqueShifts.set(shift.id, shift);
  }
  const shifts = [...uniqueShifts.values()];
  const byShift = new Map<string, T[]>();
  const looseByDay = new Map<string, T[]>();

  for (const day of params.days) {
    const shiftsThatDay = shifts.filter((shift) => isSameDay(shift.start, day));
    for (const event of params.events) {
      const start = params.eventStart(event);
      if (!start || Number.isNaN(start.getTime()) || !isSameDay(start, day)) {
        continue;
      }
      const chosen = params.chosenShiftIds(event);
      const targets = chosen.length
        ? shiftsThatDay.filter((shift) => chosen.includes(shift.id))
        : shiftsThatDay;
      if (targets.length === 0) {
        const key = dayIso(day);
        const list = looseByDay.get(key) ?? [];
        list.push(event);
        looseByDay.set(key, list);
        continue;
      }
      for (const shift of targets) {
        const list = byShift.get(shift.id) ?? [];
        list.push(event);
        byShift.set(shift.id, list);
      }
    }
  }

  return { byShift, looseByDay };
}

export function eventShowsOnShift(
  event: {
    related_shift_ids?: string[] | null;
    shift_id?: string | null;
    start_time?: string | null;
    event_date?: string | null;
  },
  shift: { id?: string | null; start_time?: string | null },
): boolean {
  if (!shift.id) return false;
  const eventStart = vendorEventStart(event);
  const shiftStart = shift.start_time ? new Date(shift.start_time) : null;
  if (!eventStart || !shiftStart || Number.isNaN(shiftStart.getTime())) {
    return false;
  }
  if (!isSameDay(eventStart, shiftStart)) return false;
  const chosen = chosenShiftIds(event);
  return chosen.length === 0 || chosen.includes(shift.id);
}
