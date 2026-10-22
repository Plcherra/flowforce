import assert from "node:assert/strict";
import { getProductRolePermissions } from "./productRoles";
import {
  accessKeys,
  accessSwitchOn,
  diffsForAccessSwitch,
  findAccessSwitch,
  projectAccessPermissions,
  submittedFormsHidden,
} from "./permissionAccessTypes";
import type { ProductLevel } from "./productLevels";

export function runPermissionAccessTypeTests() {
  for (const level of ["owner", "admin", "manager", "staff"] as ProductLevel[]) {
    const permissions = getProductRolePermissions(level);
    const projected = projectAccessPermissions(permissions);
    for (const key of accessKeys()) {
      assert.equal(
        Boolean(projected[key]),
        Boolean(permissions[key]),
        `${level} ${key}`,
      );
    }
  }

  const manager = getProductRolePermissions("manager");
  assert.equal(manager["schedule.edit"], true);
  assert.equal(
    accessSwitchOn(manager, findAccessSwitch("shifts", "edit")!),
    true,
  );
  assert.equal(
    accessSwitchOn(manager, findAccessSwitch("shifts", "delete")!),
    false,
  );

  const templates = findAccessSwitch("form_templates", "delete")!;
  assert.deepEqual(templates.keys, ["manageForms"]);
  const afterDelete = diffsForAccessSwitch(manager, {}, "form_templates", "delete", false);
  assert.equal(afterDelete.manageForms, undefined);
  const turnedOff = diffsForAccessSwitch(
    { manageForms: true },
    {},
    "form_templates",
    "delete",
    false,
  );
  assert.equal(turnedOff.manageForms, "deny");
  assert.equal(
    accessSwitchOn(
      { manageForms: false },
      findAccessSwitch("form_templates", "edit")!,
    ),
    false,
  );
  assert.equal(submittedFormsHidden("deny_override"), true);
  assert.equal(submittedFormsHidden("role"), false);
  assert.equal(submittedFormsHidden("allow_override"), false);
}
