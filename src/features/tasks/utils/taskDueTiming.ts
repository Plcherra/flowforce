import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_SHOP_TIMEZONE = "UTC";

export type TaskDueShape = {
  due_date?: string | null;
  due_at?: string | null;
  status?: string | null;
};

const CLOSED_STATUSES = new Set(["done", "completed", "cancelled"]);

export function normalizeShopTimeZone(timeZone?: string | null): string {
  const trimmed = typeof timeZone === "string" ? timeZone.trim() : "";
  if (!trimmed) return DEFAULT_SHOP_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_SHOP_TIMEZONE;
  }
}

export function shopCalendarYmd(
  instant: Date,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): string {
  return dayjs(instant).tz(normalizeShopTimeZone(timeZone)).format("YYYY-MM-DD");
}

export function shopTodayYmd(
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): string {
  return shopCalendarYmd(now, timeZone);
}

export function shopLocalTimeDefault(
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): string {
  const zoned = dayjs(now).tz(normalizeShopTimeZone(timeZone)).add(1, "hour");
  return zoned.format("HH:mm");
}

export function dueAtFromShopLocal(
  dateYmd: string,
  timeHm: string,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): string | null {
  const trimmedDate = dateYmd.trim();
  const trimmedTime = timeHm.trim();
  if (!trimmedDate || !trimmedTime) return null;
  const parsed = dayjs.tz(
    `${trimmedDate} ${trimmedTime}`,
    "YYYY-MM-DD HH:mm",
    normalizeShopTimeZone(timeZone),
  );
  if (!parsed.isValid()) return null;
  return parsed.toDate().toISOString();
}

export function shopLocalPartsFromDueAt(
  dueAtIso: string | null | undefined,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): { dateYmd: string; timeHm: string } | null {
  if (!dueAtIso) return null;
  const parsed = dayjs(dueAtIso);
  if (!parsed.isValid()) return null;
  const zoned = parsed.tz(normalizeShopTimeZone(timeZone));
  return {
    dateYmd: zoned.format("YYYY-MM-DD"),
    timeHm: zoned.format("HH:mm"),
  };
}

export function resolveTaskDueInstant(
  task: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): Date | null {
  if (task.due_at) {
    const instant = new Date(task.due_at);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }
  if (task.due_date) {
    const end = dayjs
      .tz(task.due_date, normalizeShopTimeZone(timeZone))
      .endOf("day");
    return end.isValid() ? end.toDate() : null;
  }
  return null;
}

export function compareTaskDue(
  left: TaskDueShape,
  right: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): number {
  const leftInstant = resolveTaskDueInstant(left, timeZone);
  const rightInstant = resolveTaskDueInstant(right, timeZone);
  if (!leftInstant && !rightInstant) return 0;
  if (!leftInstant) return 1;
  if (!rightInstant) return -1;
  return leftInstant.getTime() - rightInstant.getTime();
}

function isClosedStatus(status?: string | null): boolean {
  return CLOSED_STATUSES.has((status ?? "").toLowerCase());
}

export function isTaskOverdue(
  task: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): boolean {
  if (isClosedStatus(task.status)) return false;
  const dueInstant = resolveTaskDueInstant(task, timeZone);
  if (!dueInstant) return false;
  return now.getTime() > dueInstant.getTime();
}

export function isTaskDueSoon(
  task: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
  withinMs = 24 * 60 * 60 * 1000,
): boolean {
  if (isClosedStatus(task.status)) return false;
  const dueInstant = resolveTaskDueInstant(task, timeZone);
  if (!dueInstant) return false;
  const delta = dueInstant.getTime() - now.getTime();
  return delta >= 0 && delta <= withinMs;
}

export function isTaskDueToday(
  task: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): boolean {
  if (isClosedStatus(task.status)) return false;
  const tz = normalizeShopTimeZone(timeZone);
  const today = shopCalendarYmd(now, tz);
  if (task.due_at) {
    const dueDay = shopCalendarYmd(new Date(task.due_at), tz);
    return dueDay === today && !isTaskOverdue(task, tz, now);
  }
  if (!task.due_date) return false;
  return task.due_date === today;
}

export function buildDuePayload(options: {
  dueByEnabled: boolean;
  dueByDate: string;
  dueByTime: string;
  timeZone: string;
  windowDueDate: string | null;
}): { due_date: string | null; due_at: string | null } {
  if (options.dueByEnabled) {
    const dueAtIso = dueAtFromShopLocal(
      options.dueByDate,
      options.dueByTime,
      options.timeZone,
    );
    if (!dueAtIso) {
      return { due_date: null, due_at: null };
    }
    return {
      due_date: shopCalendarYmd(new Date(dueAtIso), options.timeZone),
      due_at: dueAtIso,
    };
  }
  return {
    due_date: options.windowDueDate,
    due_at: null,
  };
}