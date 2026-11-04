import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarBoardView = "day" | "week" | "month";

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_KEY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function stepCalendarDate(
  date: Date,
  view: CalendarBoardView,
  direction: -1 | 1,
): Date {
  if (view === "month") return addMonths(date, direction);
  if (view === "week") return addDays(date, direction * 7);
  return addDays(date, direction);
}

export function daysForCalendarView(date: Date, view: CalendarBoardView): Date[] {
  if (view === "day") return [startOfDay(date)];
  if (view === "week") {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  });
}

export function formatCalendarHeading(
  date: Date,
  view: CalendarBoardView,
  locale: string,
): string {
  if (view === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);
  }
  if (view === "day") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function eventOccursOnDay(
  event: { start: string; end?: string | null },
  day: Date,
): boolean {
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return false;
  const endValue = event.end ? new Date(event.end) : start;
  const end = Number.isNaN(endValue.getTime()) ? start : endValue;
  return start.getTime() <= endOfDay(day).getTime() && end.getTime() >= startOfDay(day).getTime();
}

export function eventMatchesQuery(
  event: {
    title?: string | null;
    location?: string | null;
    description?: string | null;
    type?: string | null;
  },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [event.title, event.location, event.description, event.type].some((value) =>
    (value ?? "").toLowerCase().includes(needle),
  );
}

export function toDatetimeLocalValue(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function defaultEventWindow(now = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(end),
  };
}

export function isEndAfterStart(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}

export function calendarQuery(
  current: URLSearchParams,
  date: Date,
  eventId?: string | null,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  next.set("date", formatLocalDate(date));
  if (eventId) next.set("event", eventId);
  else next.delete("event");
  return next;
}
