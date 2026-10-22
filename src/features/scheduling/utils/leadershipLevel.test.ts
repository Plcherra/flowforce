import assert from "node:assert/strict";
import { isLeadershipLevel } from "./leadershipLevel";

export function runLeadershipLevelTests() {
  assert.equal(
    isLeadershipLevel({ name: "Staff", hierarchyLevel: 5 }),
    false,
  );
  assert.equal(isLeadershipLevel({ productLevel: "staff", hierarchyLevel: 5 }), false);
  assert.equal(isLeadershipLevel({ hierarchyLevel: 1 }), false);
  assert.equal(isLeadershipLevel({ hierarchyLevel: 2 }), true);
  assert.equal(isLeadershipLevel({ name: "Manager", hierarchyLevel: 2 }), true);
  assert.equal(isLeadershipLevel({ hierarchyLevel: 3 }), true);
  assert.equal(isLeadershipLevel({ name: "Admin" }), true);
  assert.equal(isLeadershipLevel({ name: "Owner", hierarchyLevel: 4 }), true);
  assert.equal(isLeadershipLevel({ hierarchyLevel: 4 }), true);
}
