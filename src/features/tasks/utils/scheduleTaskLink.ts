/**
 * Read the schedule link stored on a normal task row.
 * A shift task is a tasks row with source "schedule" and links.schedule_id.
 */

export interface ScheduleTaskLink {
  scheduleId: string;
  shiftTitle: string;
  href: string;
}

interface ScheduleTaskLinkInput {
  source?: string | null;
  links?: unknown;
}

function isLinkRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readScheduleTaskLink(
  task: ScheduleTaskLinkInput | null | undefined,
): ScheduleTaskLink | null {
  if (!task || task.source !== "schedule") return null;
  if (!isLinkRecord(task.links)) return null;

  const scheduleId = nonEmptyString(task.links.schedule_id);
  if (!scheduleId) return null;

  return {
    scheduleId,
    shiftTitle: nonEmptyString(task.links.shift_title) ?? "Shift",
    href: `/app/enhanced-scheduling?shift=${scheduleId}`,
  };
}

/**
 * Calendar date of a shift end, in local time.
 * Returns null when the time is missing or invalid.
 */
export function dueDateFromShiftEnd(
  endIso: string | null | undefined,
): string | null {
  if (typeof endIso !== "string" || endIso.trim() === "") return null;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return null;

  const year = end.getFullYear();
  const month = String(end.getMonth() + 1).padStart(2, "0");
  const day = String(end.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
