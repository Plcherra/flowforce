import assert from "node:assert/strict";
import { calendarEventHref } from "./calendarEventHref";

export function runCalendarEventHrefTests() {
  assert.equal(calendarEventHref({}), "/app/calendar");
  assert.equal(
    calendarEventHref({ date: "2026-10-26" }),
    "/app/calendar?date=2026-10-26",
  );
  assert.equal(
    calendarEventHref({ date: "2026-10-26", eventId: "event-1" }),
    "/app/calendar?date=2026-10-26&event=event-1",
  );
}
