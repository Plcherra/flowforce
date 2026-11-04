import assert from "node:assert/strict";
import {
  canSeeTask,
  defaultTaskAudience,
  parseTaskAudience,
  taskAudienceJson,
  taskAudienceReady,
  taskInvolvesViewer,
} from "./taskAudience";

export function runTaskAudienceTests() {
  assert.equal(defaultTaskAudience("cashier").kind, "private");
  assert.equal(defaultTaskAudience(null).kind, "company");
  assert.equal(defaultTaskAudience("").kind, "company");

  const parsed = parseTaskAudience({
    kind: "position",
    position_ids: ["supervisor"],
  });
  assert.equal(parsed.kind, "position");
  assert.deepEqual(parsed.positionIds, ["supervisor"]);
  assert.equal(taskAudienceReady(parsed), true);
  assert.equal(taskAudienceReady({ ...parsed, positionIds: [] }), false);
  assert.deepEqual(taskAudienceJson(parsed).position_ids, ["supervisor"]);
  assert.equal(parseTaskAudience(null).kind, "private");

  const now = new Date("2026-10-26T12:00:00.000Z");
  const mine = {
    created_by: "manager",
    assigned_to: "ada",
    links: { publish_state: "published", assignee_ids: ["ada"] },
  };
  const coworkers = {
    created_by: "manager",
    assigned_to: "ben",
    links: { publish_state: "published", assignee_ids: ["ben"] },
  };
  const shared = {
    created_by: "manager",
    assigned_to: "ben",
    links: { publish_state: "published", assignee_ids: ["ben", "ada"] },
  };
  const draft = {
    created_by: "ada",
    assigned_to: "ada",
    links: { publish_state: "draft" },
  };
  const hiddenDraft = {
    created_by: "manager",
    assigned_to: "ada",
    links: { publish_state: "draft" },
  };

  assert.equal(taskInvolvesViewer(shared, "ada"), true);
  assert.equal(taskInvolvesViewer(coworkers, "ada"), false);
  assert.equal(canSeeTask(mine, "ada", false, now), true);
  assert.equal(canSeeTask(coworkers, "ada", false, now), false);
  assert.equal(canSeeTask(shared, "ada", false, now), true);
  assert.equal(canSeeTask(coworkers, "ada", true, now), true);
  assert.equal(canSeeTask(draft, "ada", false, now), true);
  assert.equal(canSeeTask(hiddenDraft, "ada", false, now), false);
  assert.equal(canSeeTask(hiddenDraft, "manager", true, now), true);
}
