import assert from "node:assert/strict";
import {
  defaultTaskAudience,
  parseTaskAudience,
  taskAudienceJson,
  taskAudienceReady,
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
}
