import assert from "node:assert/strict";
import {
  buildDuePayload,
  dueAtFromShopLocal,
  isTaskDueToday,
  isTaskOverdue,
  resolveTaskDueInstant,
  shopCalendarYmd,
} from "./taskDueTiming";

export function runTaskDueTimingTests() {
  const tz = "America/New_York";

  const dueAt = dueAtFromShopLocal("2026-06-15", "09:30", tz);
  assert.ok(dueAt);
  const overdueBefore = new Date("2026-06-15T13:29:00.000Z");
  const overdueAfter = new Date("2026-06-15T13:31:00.000Z");
  assert.equal(
    isTaskOverdue({ due_at: dueAt, due_date: "2026-06-15", status: "todo" }, tz, overdueBefore),
    false,
  );
  assert.equal(
    isTaskOverdue({ due_at: dueAt, due_date: "2026-06-15", status: "todo" }, tz, overdueAfter),
    true,
  );
  assert.equal(
    isTaskOverdue({ due_at: dueAt, due_date: "2026-06-15", status: "completed" }, tz, overdueAfter),
    false,
  );

  const dateOnly = {
    due_date: "2026-06-14",
    due_at: null,
    status: "todo",
  };
  const morningNextDay = new Date("2026-06-15T11:00:00.000Z");
  assert.equal(isTaskOverdue(dateOnly, tz, morningNextDay), true);
  assert.equal(
    isTaskDueToday(dateOnly, tz, new Date("2026-06-14T20:00:00.000Z")),
    true,
  );

  const payload = buildDuePayload({
    dueByEnabled: true,
    dueByDate: "2026-07-01",
    dueByTime: "17:00",
    timeZone: tz,
    windowDueDate: "2026-06-30",
  });
  assert.ok(payload.due_at);
  assert.equal(payload.due_date, "2026-07-01");

  const windowOnly = buildDuePayload({
    dueByEnabled: false,
    dueByDate: "",
    dueByTime: "",
    timeZone: tz,
    windowDueDate: "2026-08-01",
  });
  assert.equal(windowOnly.due_at, null);
  assert.equal(windowOnly.due_date, "2026-08-01");

  const instant = resolveTaskDueInstant(
    { due_date: "2026-03-10", due_at: null },
    tz,
  );
  assert.ok(instant);
  assert.equal(
    shopCalendarYmd(instant, tz),
    "2026-03-10",
  );
}