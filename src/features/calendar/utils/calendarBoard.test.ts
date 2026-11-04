import assert from "node:assert/strict";
import {
  calendarQuery,
  daysForCalendarView,
  defaultEventWindow,
  eventMatchesQuery,
  eventOccursOnDay,
  formatLocalDate,
  fromDatetimeLocalValue,
  isEndAfterStart,
  parseCalendarDate,
  stepCalendarDate,
  toDatetimeLocalValue,
} from "./calendarBoard";

export function runCalendarBoardTests() {
  const monday = new Date(2026, 9, 26, 15, 0, 0, 0);

  assert.equal(parseCalendarDate("2026-10-26")?.getDate(), 26);
  assert.equal(parseCalendarDate("2026-10-26")?.getMonth(), 9);
  assert.equal(parseCalendarDate("2026-02-31"), null);
  assert.equal(parseCalendarDate("26-10-2026"), null);
  assert.equal(parseCalendarDate(null), null);
  assert.equal(formatLocalDate(monday), "2026-10-26");

  assert.equal(formatLocalDate(stepCalendarDate(monday, "day", 1)), "2026-10-27");
  assert.equal(formatLocalDate(stepCalendarDate(monday, "day", -1)), "2026-10-25");
  assert.equal(formatLocalDate(stepCalendarDate(monday, "week", 1)), "2026-11-02");
  assert.equal(formatLocalDate(stepCalendarDate(monday, "month", 1)), "2026-11-26");

  assert.equal(daysForCalendarView(monday, "day").length, 1);
  assert.equal(daysForCalendarView(monday, "week").length, 7);
  assert.equal(formatLocalDate(daysForCalendarView(monday, "week")[0]!), "2026-10-25");
  assert.equal(daysForCalendarView(monday, "month").length, 35);

  const sameDay = { start: "2026-10-26T09:00:00", end: "2026-10-26T10:00:00" };
  assert.equal(eventOccursOnDay(sameDay, monday), true);
  assert.equal(eventOccursOnDay(sameDay, new Date(2026, 9, 27)), false);
  assert.equal(
    eventOccursOnDay(
      { start: "2026-10-25T22:00:00", end: "2026-10-26T01:00:00" },
      monday,
    ),
    true,
  );
  assert.equal(eventOccursOnDay({ start: "not-a-date" }, monday), false);

  assert.equal(
    eventMatchesQuery(
      { title: "Fire inspection", location: "Kitchen", description: "", type: "vendor_visit" },
      "kitchen",
    ),
    true,
  );
  assert.equal(eventMatchesQuery({ title: "Standup" }, "payroll"), false);
  assert.equal(eventMatchesQuery({ title: "Standup" }, "  "), true);

  const window = defaultEventWindow(new Date(2026, 9, 26, 10, 20));
  assert.equal(window.start, "2026-10-26T11:00");
  assert.equal(window.end, "2026-10-26T12:00");
  const parsed = fromDatetimeLocalValue(window.start);
  assert.ok(parsed);
  assert.equal(toDatetimeLocalValue(parsed), window.start);
  assert.equal(fromDatetimeLocalValue(""), null);
  assert.equal(
    isEndAfterStart(parsed, fromDatetimeLocalValue(window.end)!),
    true,
  );
  assert.equal(isEndAfterStart(parsed, parsed), false);

  const params = calendarQuery(new URLSearchParams("panel=week"), monday, "event-1");
  assert.equal(params.get("date"), "2026-10-26");
  assert.equal(params.get("event"), "event-1");
  assert.equal(params.get("panel"), "week");
  assert.equal(calendarQuery(params, monday, null).get("event"), null);
}
