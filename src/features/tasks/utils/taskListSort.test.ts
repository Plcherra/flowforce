import assert from "node:assert/strict";
import {
  compareTaskDueForList,
  compareTasksForSort,
  parseTaskSortKey,
  priorityRank,
  sortTaskList,
} from "./taskListSort";

export function runTaskListSortTests() {
  const tz = "America/New_York";
  const now = new Date("2026-06-15T18:00:00.000Z");

  assert.equal(parseTaskSortKey(null), "due");
  assert.equal(parseTaskSortKey("priority"), "priority");
  assert.equal(parseTaskSortKey("nope"), "due");

  assert.equal(priorityRank("urgent"), 0);
  assert.equal(priorityRank("low"), 3);
  assert.equal(priorityRank(null), 100);

  const overdue = {
    id: "a",
    due_at: "2026-06-15T10:00:00.000Z",
    due_date: "2026-06-15",
    status: "todo",
    priority: "low",
    updated_at: "2026-06-14T12:00:00.000Z",
  };
  const dueLater = {
    id: "b",
    due_at: "2026-06-16T10:00:00.000Z",
    due_date: "2026-06-16",
    status: "todo",
    priority: "urgent",
    updated_at: "2026-06-15T12:00:00.000Z",
  };
  const noDue = {
    id: "c",
    due_at: null,
    due_date: null,
    status: "todo",
    priority: "high",
    updated_at: "2026-06-13T12:00:00.000Z",
  };

  assert.ok(
    compareTaskDueForList(overdue, dueLater, tz, now) < 0,
    "overdue sorts before future due",
  );
  assert.ok(
    compareTaskDueForList(dueLater, noDue, tz, now) < 0,
    "tasks with due sort before undated",
  );

  const dueSorted = sortTaskList([noDue, dueLater, overdue], "due", tz, now);
  assert.deepEqual(
    dueSorted.map((row) => row.id),
    ["a", "b", "c"],
  );

  const prioritySorted = sortTaskList([overdue, dueLater, noDue], "priority", tz, now);
  assert.equal(prioritySorted[0]?.id, "b", "urgent before overdue low");

  const updatedSorted = sortTaskList([overdue, dueLater, noDue], "updated", tz, now);
  assert.equal(updatedSorted[0]?.id, "b");

  assert.equal(
    compareTasksForSort(overdue, dueLater, "due", tz, now),
    compareTaskDueForList(overdue, dueLater, tz, now),
  );
}