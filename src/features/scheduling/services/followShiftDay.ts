export interface ShiftEventLink {
  event_id: string | null;
  shift_id: string | null;
}

/**
 * An event follows a shift only when that shift is its only link.
 * An event tied to several shifts keeps its own day, so one visit is not
 * copied onto every shift in a busy day.
 */
export function singleShiftByEvent(
  links: ShiftEventLink[],
): Map<string, string> {
  const grouped = new Map<string, Set<string>>();
  for (const link of links) {
    if (!link.event_id || !link.shift_id) continue;
    const shifts = grouped.get(link.event_id) ?? new Set<string>();
    shifts.add(link.shift_id);
    grouped.set(link.event_id, shifts);
  }

  const result = new Map<string, string>();
  for (const [eventId, shifts] of grouped) {
    if (shifts.size === 1) {
      const [shiftId] = shifts;
      if (shiftId) result.set(eventId, shiftId);
    }
  }
  return result;
}

export function reanchorClockToDay(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  targetDay: Date,
): { start: string; end: string } | null {
  if (!startIso) return null;
  const oldStart = new Date(startIso);
  if (Number.isNaN(oldStart.getTime())) return null;
  const oldEnd = endIso ? new Date(endIso) : new Date(oldStart.getTime());
  if (Number.isNaN(oldEnd.getTime())) return null;

  const start = new Date(targetDay);
  start.setHours(
    oldStart.getHours(),
    oldStart.getMinutes(),
    oldStart.getSeconds(),
    0,
  );
  const end = new Date(targetDay);
  end.setHours(oldEnd.getHours(), oldEnd.getMinutes(), oldEnd.getSeconds(), 0);
  const duration = oldEnd.getTime() - oldStart.getTime();
  if (duration > 0 && end.getTime() <= start.getTime()) {
    end.setTime(start.getTime() + duration);
  } else if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}
