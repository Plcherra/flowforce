import assert from "node:assert/strict";
import {
  READINESS_DEFINITIONS,
  applyReadinessFilter,
  readinessCounts,
} from "./readinessFilters";
import { dueAtFromShopLocal } from "./taskDueTiming";

export function runReadinessFilterTests() {
  const tz = "UTC";
  const today = new Date("2026-05-10T12:00:00.000Z");
  const dueAtPast = dueAtFromShopLocal("2026-05-10", "08:00", tz)!;
  const dueAtLater = dueAtFromShopLocal("2026-05-10", "18:00", tz)!;

  const tasks = [
    {
      id: "overdue-date",
      status: "todo",
      due_date: "2026-05-09",
      due_at: null,
      assigned_to: "person",
    },
    {
      id: "overdue-time",
      status: "in_progress",
      due_date: "2026-05-10",
      due_at: dueAtPast,
      assigned_to: null,
    },
    {
      id: "due-today",
      status: "todo",
      due_date: "2026-05-10",
      due_at: dueAtLater,
      assigned_to: null,
    },
    {
      id: "done-past",
      status: "completed",
      due_date: "2026-05-09",
      due_at: null,
      assigned_to: null,
    },
    {
      id: "later",
      status: "todo",
      due_date: "2026-05-12",
      due_at: null,
      assigned_to: "person",
    },
    {
      id: "cancelled",
      status: "cancelled",
      due_date: "2026-05-10",
      due_at: null,
      assigned_to: null,
    },
  ];

  const counts = readinessCounts(tasks, tz, today);
  assert.equal(counts.overdue, 2);
  assert.equal(counts.due, 1);
  assert.equal(counts.unassigned, 4);

  const overdue = applyReadinessFilter(tasks, "overdue", tz, today);
  assert.deepEqual(
    overdue.map((task) => task.id),
    ["overdue-date", "overdue-time"],
  );

  const due = applyReadinessFilter(tasks, "due", tz, today);
  assert.deepEqual(due.map((task) => task.id), ["due-today"]);

  assert.equal(applyReadinessFilter(tasks, null, tz, today).length, tasks.length);

  const doneOnly = tasks.filter((task) => task.status === "completed");
  assert.equal(readinessCounts(doneOnly, tz, today).overdue, 0);
  assert.equal(readinessCounts(doneOnly, tz, today).due, 0);
  assert.equal(readinessCounts(doneOnly, tz, today).unassigned, 1);
  assert.equal(
    readinessCounts(
      [
        {
          id: "shared",
          status: "todo",
          due_date: null,
          due_at: null,
          assigned_to: null,
          links: { assignee_ids: ["ada", "ben"] },
        },
      ],
      tz,
      today,
    ).unassigned,
    0,
  );

  assert.match(READINESS_DEFINITIONS.overdue, /due time/i);
  assert.equal(READINESS_DEFINITIONS.unassigned, "Nobody is assigned.");
  assert.match(READINESS_DEFINITIONS.due, /today/i);
}