import assert from "node:assert/strict";
import { generateStatusTabs } from "./statusTabs";
import { filterTasks } from "./taskFiltering";

export function runDoneTabTests() {
  const tasks = [
    { status: "done", title: "Close the line" },
    { status: "completed", title: "Wipe the pass" },
    { status: "todo", title: "Prep the station" },
  ];

  const tabs = generateStatusTabs(tasks, tasks.length);
  const doneTabs = tabs.filter(
    (tab) => tab.value === "done" || tab.value === "completed",
  );

  assert.equal(doneTabs.length, 1);
  assert.equal(doneTabs[0]?.value, "done");
  assert.equal(doneTabs[0]?.label, "Done");
  assert.equal(doneTabs[0]?.count, 2);
  assert.equal(
    tabs.some((tab) => tab.label === "Completed"),
    false,
  );

  const shown = filterTasks(tasks, "done", "all", "");
  assert.deepEqual(
    shown.map((task) => task.status),
    ["done", "completed"],
  );

  const completedFilter = filterTasks(tasks, "completed", "all", "");
  assert.equal(completedFilter.length, 2);
}
