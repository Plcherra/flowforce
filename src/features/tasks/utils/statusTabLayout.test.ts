import assert from "node:assert/strict";
import { partitionStatusTabs, statusDefinition } from "./statusTabLayout";

export function runStatusTabLayoutTests() {
  const tabs = [
    { value: "all" as const, label: "All", count: 2 },
    { value: "todo" as const, label: "To Do", count: 2 },
    { value: "in_progress" as const, label: "In Progress", count: 0 },
    { value: "review" as const, label: "In Review", count: 0 },
    { value: "blocked" as const, label: "Blocked", count: 0 },
    { value: "done" as const, label: "Done", count: 0 },
    { value: "cancelled" as const, label: "Cancelled", count: 0 },
  ];

  const split = partitionStatusTabs(tabs, "all");
  assert.deepEqual(
    split.primary.map((tab) => tab.value),
    ["all", "todo"],
  );
  assert.equal(
    split.more.some((tab) => tab.value === "cancelled"),
    true,
  );
  assert.equal(
    split.more.some((tab) => tab.value === "review"),
    true,
  );
  assert.equal(
    split.more.some((tab) => tab.value === "todo"),
    false,
  );

  const selectedZero = partitionStatusTabs(tabs, "cancelled");
  assert.equal(
    selectedZero.primary.some((tab) => tab.value === "cancelled"),
    true,
  );
  assert.equal(
    selectedZero.more.some((tab) => tab.value === "cancelled"),
    false,
  );
  assert.equal(
    selectedZero.primary.some((tab) => tab.value === "all"),
    true,
  );

  assert.equal(statusDefinition("all"), "Every task on this page.");
  assert.equal(statusDefinition("todo"), "Not started yet.");
  assert.equal(statusDefinition("in_progress"), "Someone is working on it.");
  assert.equal(statusDefinition("review"), "Waiting to be checked.");
  assert.equal(
    statusDefinition("blocked"),
    "Cannot continue until something else is done.",
  );
  assert.equal(
    statusDefinition("done"),
    "Finished. Includes tasks stored as done or completed.",
  );
  assert.equal(
    statusDefinition("cancelled"),
    "Stopped, and not expected to be finished.",
  );
  assert.equal(statusDefinition("other"), "A status this page does not name.");
  assert.equal(statusDefinition("mystery"), "A status this page does not name.");
}
