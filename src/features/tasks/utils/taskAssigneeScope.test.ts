import assert from "node:assert/strict";
import { revokeTaskCreationGrant, type TaskCreateGrant } from "@/features/roles/constants/taskCreateScope";
import { peopleWithinTaskCreateScope, scopeForPerson } from "./taskAssigneeScope";

const people = [
  { id: "ana", level: 1, name: "Ana" },
  { id: "bo", level: 2, name: "Bo" },
  { id: "john", level: 3, name: "John" },
  { id: "marcus", level: 4, name: "Marcus" },
];

const grant: TaskCreateGrant = {
  id: "grant-john",
  granteeId: "john",
  canGrant: false,
  levels: [3, 4],
  userIds: [],
  revoked: false,
};

function ids(level: number, personId: string, grants: readonly TaskCreateGrant[]) {
  return peopleWithinTaskCreateScope({
    selfId: personId,
    scope: scopeForPerson({ level, personId, grants }),
    people,
  }).map((person) => person.id);
}

export function runTaskAssigneeScopeTests() {
  assert.deepEqual(ids(1, "ana", []), ["ana"]);
  assert.deepEqual(ids(3, "john", [grant]), ["bo", "john", "marcus"]);
  assert.deepEqual(ids(3, "john", revokeTaskCreationGrant([grant], "grant-john")), [
    "bo",
    "john",
  ]);
}
