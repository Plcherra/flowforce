import assert from "node:assert/strict";
import { readHireDate, resolveInviteDepartmentId } from "./inviteDepartment";
import { inviteErrorText } from "./inviteLocation";

export function runInviteDepartmentTests() {
  assert.equal(readHireDate("2026-11-16"), "2026-11-16");
  assert.equal(readHireDate(" 2026-02-28 "), "2026-02-28");
  assert.equal(readHireDate("2026-02-31"), null);
  assert.equal(readHireDate("16/11/2026"), null);
  assert.equal(readHireDate(""), null);
  assert.equal(readHireDate(null), null);

  assert.deepEqual(
    resolveInviteDepartmentId({ requestedId: null, departmentIds: [] }),
    { ok: true, departmentId: null },
  );
  assert.deepEqual(
    resolveInviteDepartmentId({ requestedId: "dept-x", departmentIds: [] }),
    { ok: false, code: "department_forbidden" },
  );
  assert.deepEqual(
    resolveInviteDepartmentId({ requestedId: null, departmentIds: ["dept-a"] }),
    { ok: true, departmentId: "dept-a" },
  );
  assert.deepEqual(
    resolveInviteDepartmentId({
      requestedId: null,
      departmentIds: ["dept-a", "dept-b"],
    }),
    { ok: false, code: "department_required" },
  );
  assert.deepEqual(
    resolveInviteDepartmentId({
      requestedId: "dept-b",
      departmentIds: ["dept-a", "dept-b"],
    }),
    { ok: true, departmentId: "dept-b" },
  );
  assert.deepEqual(
    resolveInviteDepartmentId({
      requestedId: "other",
      departmentIds: ["dept-a", "dept-b"],
    }),
    { ok: false, code: "department_forbidden" },
  );

  const translate = (key: string) => key;
  assert.equal(
    inviteErrorText(translate, "start_date_required", "fallback"),
    "employees.startDateRequired",
  );
  assert.equal(
    inviteErrorText(translate, "department_required", "fallback"),
    "employees.departmentRequired",
  );
}
