import assert from "node:assert/strict";
import { isShopRole, rolesForInvite, rolesInDepartment } from "./inviteRoleChoices";

export function runInviteRoleChoiceTests() {
  const roles = [
    { id: "staff", name: "Staff", is_system_role: true, department_id: null },
    { id: "manager", name: "Manager", is_system_role: true, department_id: null },
    { id: "barista", name: "Barista", is_system_role: false, department_id: "foh" },
    { id: "lead", name: "Shift lead", is_system_role: false, department_id: "foh" },
    { id: "baker", name: "Baker/Prep", is_system_role: false, department_id: "boh" },
  ];
  assert.equal(isShopRole(roles[0]), false);
  assert.equal(isShopRole(roles[2]), true);
  assert.deepEqual(
    rolesForInvite(roles).map((role) => role.name),
    ["Barista", "Shift lead", "Baker/Prep"],
  );
  assert.deepEqual(
    rolesInDepartment(roles, "foh").map((role) => role.name),
    ["Barista", "Shift lead"],
  );
  assert.deepEqual(
    rolesForInvite([{ id: "staff", name: "Staff", is_system_role: true }]).map((role) => role.name),
    ["Staff"],
  );
}
