import assert from "node:assert/strict";
import { getProductRolePermissions } from "./productRoles";
import {
  applyPermissionDiffsToClassPermissions,
  operatorVerbsToPermissionDiffs,
  permissionDiffsToOperatorVerbs,
  retainAllowedDiffs,
} from "./personAccessDiffs";

export function runPersonAccessDiffTests() {
  const manager = getProductRolePermissions("manager");
  const managerVerbs = permissionDiffsToOperatorVerbs("manager", manager, {});
  assert.equal(managerVerbs.includes("time_off:edit"), true);

  const withoutTimeOff = managerVerbs.filter((verb) => verb !== "time_off:edit");
  const jordanDiffs = operatorVerbsToPermissionDiffs(
    "manager",
    manager,
    withoutTimeOff,
  );
  assert.equal(jordanDiffs.approveTimeOff, "deny");
  assert.equal(jordanDiffs["schedule.edit"], undefined);

  const jordanEffective = applyPermissionDiffsToClassPermissions(
    "manager",
    manager,
    jordanDiffs,
  );
  assert.equal(jordanEffective.approveTimeOff, false);
  assert.equal(jordanEffective["schedule.edit"], true);

  const staff = getProductRolePermissions("staff");
  const droppedOnStaff = retainAllowedDiffs("staff", staff, jordanDiffs);
  assert.equal(droppedOnStaff.approveTimeOff, undefined);

  const admin = getProductRolePermissions("admin");
  const keptOnAdmin = retainAllowedDiffs("admin", admin, jordanDiffs);
  assert.equal(keptOnAdmin.approveTimeOff, "deny");

  const staffVerbs = permissionDiffsToOperatorVerbs("staff", staff, {});
  const staffWithTeamSchedule = [...staffVerbs, "team_schedule:see"];
  const staffGive = operatorVerbsToPermissionDiffs(
    "staff",
    staff,
    staffWithTeamSchedule,
  );
  assert.equal(staffGive.viewTeamSchedules, "allow");
  assert.equal(staffGive["schedule.view"], "allow");
  assert.equal(staffGive["billing.manage"], undefined);
}
