import assert from "node:assert/strict";
import { filterTasks } from "./taskFiltering";
import { readTaskKind, TASK_KIND_LABELS } from "./taskKind";

export function runTaskKindTests() {
  assert.equal(readTaskKind({ source: "schedule" }), "shift");
  assert.equal(readTaskKind({ source: "form" }), "checklist");
  assert.equal(readTaskKind({ source: null }), "custom");
  assert.equal(readTaskKind({ source: "manual" }), "custom");
  assert.equal(readTaskKind({}), "custom");

  assert.equal(TASK_KIND_LABELS.shift, "Shift");
  assert.equal(TASK_KIND_LABELS.checklist, "Checklist");
  assert.equal(TASK_KIND_LABELS.custom, "Custom");

  const tasks = [
    { title: "Review the delivery", source: "schedule", status: "todo" },
    { title: "Opening checklist", source: "form", status: "todo" },
    { title: "Bake 3 portions", source: null, status: "todo" },
  ];

  assert.deepEqual(
    filterTasks(tasks, "all", "all", "", "shift").map((task) => task.title),
    ["Review the delivery"],
  );
  assert.deepEqual(
    filterTasks(tasks, "all", "all", "", "checklist").map((task) => task.title),
    ["Opening checklist"],
  );
  assert.deepEqual(
    filterTasks(tasks, "all", "all", "", "custom").map((task) => task.title),
    ["Bake 3 portions"],
  );
  assert.equal(filterTasks(tasks, "all", "all", "").length, 3);
}
