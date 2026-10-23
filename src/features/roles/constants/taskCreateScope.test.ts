import assert from "node:assert/strict";
import {
  canGrantTaskCreation,
  defaultTaskCreateScope,
  effectiveTaskCreateScope,
  grantTaskCreation,
  revokeTaskCreationGrant,
  type TaskCreateGrant,
} from "./taskCreateScope";

export function runTaskCreateScopeTests() {
  assert.deepEqual(defaultTaskCreateScope(1), {
    self: true,
    levels: [],
    userIds: [],
  });
  assert.deepEqual(defaultTaskCreateScope(3), {
    self: true,
    levels: [2],
    userIds: [],
  });
  assert.deepEqual(defaultTaskCreateScope(4).levels, [3]);

  const marcusGrant: TaskCreateGrant = {
    id: "marcus-grant",
    granteeId: "marcus",
    canGrant: true,
    levels: [],
    userIds: [],
    revoked: false,
  };
  const ownerGrants = grantTaskCreation({
    grants: [],
    grant: marcusGrant,
    actorCanGrant: true,
  });
  assert.equal(canGrantTaskCreation(ownerGrants, "marcus", false), true);
  assert.equal(canGrantTaskCreation([], "marcus", false), false);

  const johnGrant: TaskCreateGrant = {
    id: "john-grant",
    granteeId: "john",
    canGrant: false,
    levels: [3, 4],
    userIds: ["coworker-a"],
    revoked: false,
  };
  const withJohn = grantTaskCreation({
    grants: ownerGrants,
    grant: johnGrant,
    actorCanGrant: canGrantTaskCreation(ownerGrants, "marcus", false),
  });
  assert.deepEqual(effectiveTaskCreateScope(3, "john", withJohn), {
    self: true,
    levels: [2, 3, 4],
    userIds: ["coworker-a"],
  });

  const blocked = grantTaskCreation({
    grants: ownerGrants,
    grant: johnGrant,
    actorCanGrant: canGrantTaskCreation(ownerGrants, "stranger", false),
  });
  assert.equal(blocked.some((grant) => grant.id === "john-grant"), false);

  const revoked = revokeTaskCreationGrant(withJohn, "john-grant");
  assert.deepEqual(effectiveTaskCreateScope(3, "john", revoked), {
    self: true,
    levels: [2],
    userIds: [],
  });
  assert.equal(canGrantTaskCreation(revoked, "marcus", false), true);
  assert.equal(
    revoked.find((grant) => grant.id === "marcus-grant")?.revoked,
    false,
  );
}
