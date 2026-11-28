import assert from "node:assert/strict";

import {
  isAllowedTaskStatusTransition,
  normalizeFromStatusForTransition,
  normalizeToStatusForTransition,
} from "./taskStatusTransitions";

export function runTaskStatusTransitionTests() {
  assert.equal(normalizeFromStatusForTransition("open"), "todo");
  assert.equal(normalizeFromStatusForTransition("in_progress"), "todo");
  assert.equal(normalizeToStatusForTransition("done"), "completed");
  assert.equal(normalizeToStatusForTransition("in_progress"), null);

  assert.equal(isAllowedTaskStatusTransition("todo", "completed"), true);
  assert.equal(isAllowedTaskStatusTransition("todo", "in_progress"), false);
  assert.equal(isAllowedTaskStatusTransition("todo", "review"), false);
  assert.equal(isAllowedTaskStatusTransition("todo", "cancelled"), true);
  assert.equal(isAllowedTaskStatusTransition("open", "completed"), true);
  assert.equal(isAllowedTaskStatusTransition("in_progress", "completed"), true);
  assert.equal(isAllowedTaskStatusTransition("in_progress", "todo"), true);
  assert.equal(isAllowedTaskStatusTransition("in_progress", "review"), false);
  assert.equal(isAllowedTaskStatusTransition("completed", "in_progress"), false);
  assert.equal(isAllowedTaskStatusTransition("completed", "todo"), true);
  assert.equal(isAllowedTaskStatusTransition("cancelled", "todo"), true);
  assert.equal(isAllowedTaskStatusTransition("todo", "done"), true);
}