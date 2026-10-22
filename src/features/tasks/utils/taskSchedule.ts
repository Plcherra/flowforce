import { format } from "date-fns";
import { dueDateFromShiftEnd } from "./scheduleTaskLink";

export type TaskPublishState = "published" | "scheduled" | "draft";

export interface TaskSchedule {
  startsAt: string | null;
  endsAt: string | null;
  publishState: TaskPublishState;
}

const PUBLISH_STATES = new Set<TaskPublishState>([
  "published",
  "scheduled",
  "draft",
]);

function isLinkRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readPublishState(links: unknown): TaskPublishState {
  if (!isLinkRecord(links)) return "published";
  const value = links.publish_state;
  if (typeof value === "string" && PUBLISH_STATES.has(value as TaskPublishState)) {
    return value as TaskPublishState;
  }
  return "published";
}

export function readTaskSchedule(links: unknown): TaskSchedule {
  if (!isLinkRecord(links)) {
    return { startsAt: null, endsAt: null, publishState: "published" };
  }
  return {
    startsAt: nonEmptyString(links.starts_at),
    endsAt: nonEmptyString(links.ends_at),
    publishState: readPublishState(links),
  };
}

/**
 * Calendar date of the window end, in local time.
 * The window is when the task is open. It is not how long the work takes.
 */
export function dueDateFromWindowEnd(
  endIso: string | null | undefined,
): string | null {
  return dueDateFromShiftEnd(endIso);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function mergeTaskSchedule(
  links: unknown,
  schedule: TaskSchedule,
): Record<string, unknown> {
  const base = isLinkRecord(links) ? { ...links } : {};
  return {
    ...base,
    starts_at: schedule.startsAt,
    ends_at: schedule.endsAt,
    publish_state: schedule.publishState,
  };
}

export function isTaskListedForViewer(
  task: { created_by?: string | null; links?: unknown },
  viewerId: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const state = readPublishState(task.links);
  if (state === "published") return true;
  const isCreator = Boolean(viewerId) && task.created_by === viewerId;
  if (isCreator) return true;
  if (state === "draft") return false;

  const startsAt = readTaskSchedule(task.links).startsAt;
  if (!startsAt) return false;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() <= now.getTime();
}

export function formatTaskWindow(
  startsAt: string | null,
  endsAt: string | null,
): string | null {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  const validStart =
    start && !Number.isNaN(start.getTime()) ? start : null;
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;
  if (!validStart && !validEnd) return null;
  const pattern = "EEE d MMM, h:mm a";
  if (validStart && validEnd) {
    return `${format(validStart, pattern)} – ${format(validEnd, pattern)}`;
  }
  return format(validStart ?? validEnd!, pattern);
}

export function taskPublishLabel(
  state: TaskPublishState,
): "Draft" | "Scheduled" | null {
  if (state === "draft") return "Draft";
  if (state === "scheduled") return "Scheduled";
  return null;
}
