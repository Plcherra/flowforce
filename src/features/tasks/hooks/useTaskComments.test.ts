import assert from "node:assert/strict";

/** Effect deps for loading comments — do not add useTasks().getTaskComments here. */
export const TASK_COMMENTS_FETCH_EFFECT_DEPS = ["open", "taskId"] as const;

/**
 * Guards against re-introducing unstable deps on useTasks().getTaskComments,
 * which caused the task-details comments skeleton to load forever.
 */
export function runUseTaskCommentsEffectDepTests() {
  assert.deepEqual(TASK_COMMENTS_FETCH_EFFECT_DEPS, ["open", "taskId"]);
  assert.equal(TASK_COMMENTS_FETCH_EFFECT_DEPS.length, 2);
}