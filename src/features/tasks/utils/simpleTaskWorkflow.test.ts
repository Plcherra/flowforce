import assert from "node:assert/strict";
import {
  displayStatusKey,
  isOpenTaskStatus,
  matchesStatusTabFilter,
  statusBucketForTabs,
} from "./simpleTaskWorkflow";

export function runSimpleTaskWorkflowTests() {
  assert.equal(isOpenTaskStatus("todo"), true);
  assert.equal(isOpenTaskStatus("in_progress"), true);
  assert.equal(isOpenTaskStatus("completed"), false);

  assert.equal(statusBucketForTabs("in_progress"), "todo");
  assert.equal(statusBucketForTabs("review"), "todo");
  assert.equal(statusBucketForTabs("blocked"), "todo");
  assert.equal(statusBucketForTabs("completed"), "done");

  assert.equal(displayStatusKey("in_progress"), "todo");
  assert.equal(displayStatusKey("completed"), "completed");

  assert.equal(matchesStatusTabFilter("in_progress", "todo"), true);
  assert.equal(matchesStatusTabFilter("todo", "todo"), true);
  assert.equal(matchesStatusTabFilter("in_progress", "review"), false);
  assert.equal(matchesStatusTabFilter("completed", "done"), true);
}