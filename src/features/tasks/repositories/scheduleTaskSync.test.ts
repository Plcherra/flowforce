import assert from "node:assert/strict";
import { linkedTaskFieldsForShift } from "./scheduleTaskSync";

export function runScheduleTaskSyncTests() {
  const end = new Date(2026, 6, 9, 1, 0, 0);
  const moved = linkedTaskFieldsForShift(end.toISOString(), ["person-b"]);
  assert.equal(moved.due_date, "2026-07-09");
  assert.equal(moved.assigned_to, "person-b");

  const firstPerson = linkedTaskFieldsForShift(end.toISOString(), [
    null,
    "   ",
    "person-a",
    "person-b",
  ]);
  assert.equal(firstPerson.assigned_to, "person-a");

  const cleared = linkedTaskFieldsForShift(end.toISOString(), []);
  assert.equal(cleared.assigned_to, null);

  assert.throws(() => linkedTaskFieldsForShift(null, ["person-a"]));
  assert.throws(() => linkedTaskFieldsForShift("not-a-date", ["person-a"]));
}
