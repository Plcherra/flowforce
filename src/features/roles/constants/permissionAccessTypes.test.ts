import assert from "node:assert/strict";
import { PERMISSION_KEYS } from "@/lib/permissions/registry";
import { getProductRolePermissions } from "./productRoles";
import {
  ACCESS_ROWS,
  ACCESS_SWITCH_TYPES,
  accessKeys,
  accessSwitchOn,
  accessSwitchTypeAllowed,
  diffsForAccessSwitch,
  findAccessSwitch,
  projectAccessPermissions,
  rowShowsWriteSwitch,
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

  for (const row of ACCESS_ROWS) {
    for (const item of row.switches) {
      assert.equal(
        accessSwitchTypeAllowed(item.id),
        true,
        `${row.id} ${item.id}`,
      );
      assert.equal(ACCESS_SWITCH_TYPES.includes(item.id), true);
    }
  }

  const ownSchedule = ACCESS_ROWS.find((row) => row.id === "own_schedule");
  assert.ok(ownSchedule);
  assert.equal(rowShowsWriteSwitch(ownSchedule), false);
  assert.deepEqual(
    ownSchedule.switches.map((item) => item.id),
    ["read"],
  );

  const inventoryExport = ACCESS_ROWS.find((row) => row.id === "inventory_export");
  assert.ok(inventoryExport);
  assert.equal(rowShowsWriteSwitch(inventoryExport), false);

  const timeOff = findAccessSwitch("time_off", "edit");
  assert.ok(timeOff);
  assert.equal(timeOff.keys.includes("approveTimeOff"), true);
  assert.equal(findAccessSwitch("time_off", "approve"), undefined);
  assert.equal(PERMISSION_KEYS.includes("approveTimeOff"), true);
}
