import assert from "node:assert/strict";
import {
  reanchorClockToDay,
  singleShiftByEvent,
} from "./followShiftDay";

export function runFollowShiftDayTests() {
  const singles = singleShiftByEvent([
    { event_id: "visit-1", shift_id: "shift-a" },
    { event_id: "visit-2", shift_id: "shift-a" },
    { event_id: "visit-2", shift_id: "shift-b" },
    { event_id: null, shift_id: "shift-a" },
  ]);
  assert.equal(singles.get("visit-1"), "shift-a");
  assert.equal(singles.has("visit-2"), false);

  const target = new Date(2026, 9, 21, 0, 0, 0, 0);
  const moved = reanchorClockToDay(
    "2026-10-19T14:30:00.000Z",
    "2026-10-19T15:00:00.000Z",
    target,
  );
  assert.ok(moved);
  const start = new Date(moved.start);
  const end = new Date(moved.end);
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 9);
  assert.equal(start.getDate(), 21);
  assert.equal(start.getHours(), new Date("2026-10-19T14:30:00.000Z").getHours());
  assert.equal(start.getMinutes(), new Date("2026-10-19T14:30:00.000Z").getMinutes());
  assert.equal(end.getTime() - start.getTime(), 30 * 60 * 1000);
  assert.equal(reanchorClockToDay(null, null, target), null);
}
