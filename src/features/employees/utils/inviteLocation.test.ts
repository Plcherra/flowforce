import assert from "node:assert/strict";
import {
  actorCanInvite,
  locationsAssignableByActor,
  resolveInviteLocationId,
} from "./inviteLocation";

const stores = [
  { id: "store-a", name: "North", active: true },
  { id: "store-b", name: "South", active: true },
  { id: "store-closed", name: "Closed", active: false },
];

export function runInviteLocationTests() {
  assert.equal(
    actorCanInvite({ role: "staff", permissions: {} }),
    false,
  );
  assert.equal(
    actorCanInvite({ role: "manager", permissions: {} }),
    true,
  );
  assert.equal(
    actorCanInvite({ role: "admin", permissions: { manageUsers: false } }),
    false,
  );
  assert.equal(
    actorCanInvite({ role: "staff", permissions: { manageUsers: true } }),
    true,
  );

  const ownerStores = locationsAssignableByActor({
    locations: stores,
    actorLevel: "owner",
    actorLocationId: "store-a",
    canInvite: true,
  }).map((store) => store.id);
  assert.deepEqual(ownerStores, ["store-a", "store-b"]);

  const managerStores = locationsAssignableByActor({
    locations: stores,
    actorLevel: "manager",
    actorLocationId: "store-a",
    canInvite: true,
  }).map((store) => store.id);
  assert.deepEqual(managerStores, ["store-a"]);

  const unscopedManager = locationsAssignableByActor({
    locations: stores,
    actorLevel: "manager",
    actorLocationId: null,
    canInvite: true,
  }).map((store) => store.id);
  assert.deepEqual(unscopedManager, ["store-a", "store-b"]);

  assert.deepEqual(
    locationsAssignableByActor({
      locations: stores,
      actorLevel: "admin",
      actorLocationId: null,
      canInvite: false,
    }),
    [],
  );

  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: "store-b",
      allowedIds: ["store-a", "store-b"],
      companyHasActiveLocations: true,
    }),
    { ok: true, locationId: "store-b" },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: "",
      allowedIds: ["store-a"],
      companyHasActiveLocations: true,
    }),
    { ok: true, locationId: "store-a" },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: "",
      allowedIds: ["store-a", "store-b"],
      companyHasActiveLocations: true,
    }),
    { ok: false, code: "location_required" },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: "store-b",
      allowedIds: ["store-a"],
      companyHasActiveLocations: true,
    }),
    { ok: false, code: "location_forbidden" },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: null,
      allowedIds: ["store-a"],
      companyHasActiveLocations: true,
    }),
    { ok: true, locationId: "store-a" },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: null,
      allowedIds: [],
      companyHasActiveLocations: false,
    }),
    { ok: true, locationId: null },
  );
  assert.deepEqual(
    resolveInviteLocationId({
      requestedId: "store-a",
      allowedIds: [],
      companyHasActiveLocations: false,
    }),
    { ok: false, code: "location_forbidden" },
  );
}
