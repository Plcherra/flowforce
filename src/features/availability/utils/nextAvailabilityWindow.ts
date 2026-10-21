/**
 * Approved fixed availability lands on the next schedule window after the
 * next posting weekday. A send on the posting weekday skips the window that
 * posting is for. Weekdays are 0 (Sunday) through 6 (Saturday).
 */

export interface FixedAvailabilityWindowInput {
  sendDate: string;
  postingWeekday: number;
  windowStartWeekday: number;
  windowEndWeekday: number;
}

export interface FixedAvailabilityWindow {
  postingDate: string;
  windowStart: string;
  windowEnd: string;
  postedWindowStart: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function assertWeekday(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    throw new Error(`${label} must be a weekday from 0 through 6`);
  }
}

function parseUtcDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`Expected an ISO date, received ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysUntilWeekday(fromWeekday: number, targetWeekday: number) {
  return (targetWeekday - fromWeekday + 7) % 7;
}

/** Next posting date after this send. A send on the posting weekday waits for the following one. */
export function nextPostingDate(sendDate: string, postingWeekday: number) {
  assertWeekday(postingWeekday, "postingWeekday");
  const send = parseUtcDate(sendDate);
  const sendWeekday = send.getUTCDay();
  const daysUntil =
    sendWeekday === postingWeekday ? 7 : daysUntilWeekday(sendWeekday, postingWeekday);
  return formatUtcDate(addUtcDays(send, daysUntil));
}

function previousOrCurrentPostingDate(sendDate: string, postingWeekday: number) {
  assertWeekday(postingWeekday, "postingWeekday");
  const send = parseUtcDate(sendDate);
  const daysSince = (send.getUTCDay() - postingWeekday + 7) % 7;
  return formatUtcDate(addUtcDays(send, -daysSince));
}

/** First window start strictly after the given date. */
export function nextWindowStartAfter(date: string, windowStartWeekday: number) {
  assertWeekday(windowStartWeekday, "windowStartWeekday");
  const cursor = parseUtcDate(date);
  const daysUntil = daysUntilWeekday(cursor.getUTCDay(), windowStartWeekday);
  const offset = daysUntil === 0 ? 7 : daysUntil;
  return formatUtcDate(addUtcDays(cursor, offset));
}

function windowEndOn(windowStart: string, windowEndWeekday: number) {
  assertWeekday(windowEndWeekday, "windowEndWeekday");
  const start = parseUtcDate(windowStart);
  const daysUntil = daysUntilWeekday(start.getUTCDay(), windowEndWeekday);
  return formatUtcDate(addUtcDays(start, daysUntil));
}

export function approvedFixedAvailabilityWindow(
  input: FixedAvailabilityWindowInput,
): FixedAvailabilityWindow {
  const postingDate = nextPostingDate(input.sendDate, input.postingWeekday);
  const windowStart = nextWindowStartAfter(postingDate, input.windowStartWeekday);
  const postedWindowStart = nextWindowStartAfter(
    previousOrCurrentPostingDate(input.sendDate, input.postingWeekday),
    input.windowStartWeekday,
  );
  return {
    postingDate,
    windowStart,
    windowEnd: windowEndOn(windowStart, input.windowEndWeekday),
    postedWindowStart,
  };
}
