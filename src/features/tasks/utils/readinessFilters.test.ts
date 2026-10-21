import assert from "node:assert/strict";
import {
  READINESS_DEFINITIONS,
  applyReadinessFilter,
  readinessCounts,
} from "./readinessFilters";

export function runReadinessFilterTests() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const tasks = [
    {
      id: "overdue",
      status: "todo",
      due_date: yesterday.toISOString(),
      assigned_to: "person",
    },
    {
      id: "due",
      status: "in_progress",
      due_date: today.toISOString(),
      assigned_to: null,
    },
    {
      id: "done-past",
      status: "completed",
      due_date: yesterday.toISOString(),
      assigned_to: null,
    },
    {
      id: "later",
      status: "todo",
      due_date: tomorrow.toISOString(),
      assigned_to: "person",
    },
    {
      id: "cancelled",
      status: "cancelled",
      due_date: today.toISOString(),
      assigned_to: null,
    },
  ];

  const counts = readinessCounts(tasks);
  assert.equal(counts.overdue, 1);
  assert.equal(counts.due, 1);
  assert.equal(counts.unassigned, 3);

  const overdue = applyReadinessFilter(tasks, "overdue");
  assert.deepEqual(
    overdue.map((task) => task.id),
    ["overdue"],
  );

  const due = applyReadinessFilter(tasks, "due");
  assert.deepEqual(
    due.map((task) => task.id),
    ["due"],
  );

  assert.equal(applyReadinessFilter(tasks, null).length, tasks.length);
  assert.equal(applyReadinessFilter(overdue, null).length, 1);

  const doneOnly = tasks.filter((task) => task.status === "completed");
  assert.equal(readinessCounts(doneOnly).overdue, 0);
  assert.equal(readinessCounts(doneOnly).due, 0);
  assert.equal(readinessCounts(doneOnly).unassigned, 1);

  assert.equal(
    READINESS_DEFINITIONS.overdue,
    "The due date is before today, and the task is not done or cancelled.",
  );
  assert.equal(READINESS_DEFINITIONS.unassigned, "Nobody is assigned.");
  assert.equal(
    READINESS_DEFINITIONS.due,
    "The due date is today, and the task is not done or cancelled.",
  );
}
