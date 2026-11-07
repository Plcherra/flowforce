import assert from "node:assert/strict";
import {
  departmentNameProblem,
  displayShiftDepartment,
  displayShiftRole,
  mergeShiftAssignment,
  readShiftAssignment,
} from "./shiftRoleDepartment";

const ROLES = [
  { id: "role-cashier", name: "Cashier" },
  { id: "role-staff", name: "Staff" },
];
const DEPARTMENTS = [{ id: "dept-front", name: "Front of house" }];

export function runShiftRoleDepartmentTests() {
  const stored = mergeShiftAssignment(
    { copilot: { slotId: "slot-1" } },
    { roleId: "role-cashier", roleName: "Cashier", departmentId: "dept-front" },
  );
  assert.deepEqual(stored.copilot, { slotId: "slot-1" });
  assert.deepEqual(readShiftAssignment(stored), {
    roleId: "role-cashier",
    roleName: "Cashier",
    departmentId: "dept-front",
  });
  assert.deepEqual(mergeShiftAssignment(["skill"], {
    roleId: null,
    roleName: null,
    departmentId: "dept-front",
  }).items, ["skill"]);

  assert.equal(
    displayShiftRole({
      role: "Staff",
      requirements: stored,
      roles: ROLES,
    }),
    "Cashier",
  );
  assert.equal(
    displayShiftRole({ role: "Staff", requirements: null, roles: ROLES }),
    null,
  );
  assert.equal(
    displayShiftRole({ role: "Barista", requirements: null, roles: ROLES }),
    "Barista",
  );
  assert.equal(
    displayShiftDepartment({ requirements: stored, departments: DEPARTMENTS }),
    "Front of house",
  );
  assert.equal(
    displayShiftDepartment({ requirements: null, departments: DEPARTMENTS }),
    null,
  );
  assert.equal(departmentNameProblem("  ", DEPARTMENTS), "empty");
  assert.equal(departmentNameProblem("Front of house", DEPARTMENTS), "duplicate");
  assert.equal(
    departmentNameProblem("Front of house", DEPARTMENTS, "dept-front"),
    null,
  );
  assert.equal(departmentNameProblem("Kitchen", DEPARTMENTS), null);
}
