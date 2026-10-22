import assert from "node:assert/strict";
import { applyPermissionDiffsToClassPermissions } from "@/features/roles/constants/personAccessDiffs";
import { getProductRolePermissions } from "@/features/roles/constants/productRoles";
import {
  diffsForTaskCreateLevel,
  retainTaskCreateDiffs,
  taskCreateLevelFromDiffs,
} from "./taskCreateAccess";

export function runTaskCreateAccessTests() {
  const manager = getProductRolePermissions("manager");
  const checklistSelf = diffsForTaskCreateLevel(
    manager,
    {},
    "checklist",
    "self",
  );
  assert.equal(checklistSelf["tasks.checklist.create_others"], "deny");
  assert.equal(checklistSelf["tasks.checklist.create_self"], undefined);
  assert.equal(checklistSelf["tasks.shift.create_others"], undefined);

  const effective = applyPermissionDiffsToClassPermissions(
    "manager",
    manager,
    checklistSelf,
  );
  assert.equal(effective["tasks.checklist.create_others"], false);
  assert.equal(effective["tasks.checklist.create_self"], true);
  assert.equal(effective["tasks.shift.create_others"], true);
  assert.equal(effective["tasks.custom.create_others"], true);
  assert.equal(effective.editTasks, true);
  assert.equal(taskCreateLevelFromDiffs(manager, checklistSelf, "checklist"), "self");
  assert.equal(taskCreateLevelFromDiffs(manager, checklistSelf, "shift"), "others");

  const none = diffsForTaskCreateLevel(manager, checklistSelf, "custom", "none");
  assert.equal(none["tasks.custom.create_others"], "deny");
  assert.equal(none["tasks.custom.create_self"], "deny");
  assert.equal(none["tasks.checklist.create_others"], "deny");
  assert.equal(retainTaskCreateDiffs(none)["tasks.custom.create_self"], "deny");

  const staff = getProductRolePermissions("staff");
  const staffSelf = diffsForTaskCreateLevel(staff, {}, "checklist", "self");
  assert.equal(staffSelf["tasks.checklist.create_self"], "allow");
  assert.equal(staffSelf["tasks.checklist.create_others"], undefined);
  const staffEffective = applyPermissionDiffsToClassPermissions(
    "staff",
    staff,
    staffSelf,
  );
  assert.equal(staffEffective["tasks.checklist.create_self"], true);
  assert.equal(staffEffective["tasks.checklist.create_others"], undefined);
}
