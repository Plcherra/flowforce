import assert from "node:assert/strict";
import { getProductRolePermissions } from "@/features/roles/constants/productRoles";
import { effectiveInvitePermissions } from "./staffInviteScheduleDefaults";

export function runStaffInviteScheduleDefaultTests() {
  const staffClass = getProductRolePermissions("staff");
  const defaults = effectiveInvitePermissions("staff", staffClass, {});

  assert.equal(defaults.viewOwnSchedules, true);
  assert.equal(defaults.viewTeamSchedules, true);
  assert.equal(defaults["schedule.view"], true);
  assert.equal(defaults.editSchedules, false);
  assert.equal(defaults["schedule.edit"], false);

  const switched = effectiveInvitePermissions("staff", staffClass, {
    editSchedules: "allow",
    "schedule.edit": "allow",
  });
  assert.equal(switched.viewOwnSchedules, true);
  assert.equal(switched.viewTeamSchedules, true);
  assert.equal(switched["schedule.view"], true);
  assert.equal(switched.editSchedules, true);
  assert.equal(switched["schedule.edit"], true);
}
