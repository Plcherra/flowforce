import assert from "node:assert/strict";
import {
  canDeactivateClass,
  clampPermissionsToProductLevel,
  cloneClassFromProductLevel,
  inferProductLevel,
  isInviteableClass,
  isOwnerMajorPermission,
  OWNER_MAJOR_PERMISSION_KEYS,
  permissionAllowedAtLevel,
} from "./productLevels";
import { PRODUCT_ROLE_KEYS } from "./productRoles";

export function runProductLevelTests() {
  assert.deepEqual([...PRODUCT_ROLE_KEYS], ["owner", "admin", "manager", "staff"]);
  assert.equal(
    PRODUCT_ROLE_KEYS.includes("shift_lead" as never),
    false,
    "Shift lead is not a product level",
  );

  assert.equal(inferProductLevel("Employee"), "staff");
  assert.equal(inferProductLevel("Kitchen manager", 2), "manager");

  const kitchen = clampPermissionsToProductLevel("manager", {
    approveTimeOff: true,
    "admin.settings": true,
    "billing.manage": true,
    "billing.view": true,
    systemSettings: true,
  });
  assert.equal(kitchen.approveTimeOff, true);
  assert.equal(kitchen["admin.settings"], undefined);
  assert.equal(kitchen["billing.manage"], undefined);
  assert.equal(kitchen["billing.view"], undefined);
  assert.equal(kitchen.systemSettings, undefined);
  assert.equal(permissionAllowedAtLevel("manager", "billing.manage"), false);

  const cloned = cloneClassFromProductLevel("manager", "Kitchen manager");
  assert.equal(cloned.product_level, "manager");
  assert.equal(cloned.name, "Kitchen manager");
  assert.equal(cloned.permissions["admin.settings"], undefined);
  assert.equal(cloned.permissions.approveTimeOff, true);

  assert.equal(canDeactivateClass({ name: "Owner", product_level: "owner" }), false);
  assert.equal(canDeactivateClass({ name: "Manager", product_level: "manager" }), true);
  assert.equal(isInviteableClass({ name: "Owner", product_level: "owner" }), false);
  assert.equal(isInviteableClass({ name: "Staff", product_level: "staff" }), true);
  assert.equal(
    isInviteableClass({ name: "Staff", product_level: "staff", is_active: false }),
    false,
  );

  const ownerStub = clampPermissionsToProductLevel("owner", {
    admin: true,
    owner: true,
    approveTimeOff: false,
    "billing.manage": false,
    systemSettings: false,
  });
  for (const key of OWNER_MAJOR_PERMISSION_KEYS) {
    assert.equal(ownerStub[key], true, `Owner keeps ${key}`);
    assert.equal(isOwnerMajorPermission(key), true);
  }
  assert.equal(ownerStub.approveTimeOff, false);
  assert.equal(isOwnerMajorPermission("approveTimeOff"), false);

  assert.equal(permissionAllowedAtLevel("staff", "viewTeamSchedules"), true);
  assert.equal(permissionAllowedAtLevel("staff", "schedule.view"), true);
  assert.equal(permissionAllowedAtLevel("staff", "viewTeamProfiles"), true);
  assert.equal(permissionAllowedAtLevel("staff", "editSchedules"), false);
  for (const key of [
    "schedule.grant",
    "schedule.reminders.assign",
    "schedule.reminders.grant_deactivate",
  ] as const) {
    assert.equal(permissionAllowedAtLevel("owner", key), true);
    assert.equal(permissionAllowedAtLevel("admin", key), true);
    assert.equal(permissionAllowedAtLevel("manager", key), true);
    assert.equal(permissionAllowedAtLevel("staff", key), false);
  }
  assert.equal(permissionAllowedAtLevel("staff", "approveTimeOff"), false);
  assert.equal(permissionAllowedAtLevel("staff", "billing.manage"), false);

  const staffGrant = clampPermissionsToProductLevel("staff", {
    viewOwnSchedules: true,
    viewTeamSchedules: true,
    "schedule.view": true,
    editSchedules: true,
    "billing.manage": true,
  });
  assert.equal(staffGrant.viewTeamSchedules, true);
  assert.equal(staffGrant["schedule.view"], true);
  assert.equal(staffGrant.editSchedules, undefined);
  assert.equal(staffGrant["billing.manage"], undefined);

  const staffDefault = cloneClassFromProductLevel("staff", "FOH");
  assert.equal(staffDefault.permissions.viewOwnSchedules, true);
  assert.equal(staffDefault.permissions.viewTeamSchedules, undefined);
}
