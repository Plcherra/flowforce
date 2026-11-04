import assert from "node:assert/strict";
import { shiftIsOpen } from "./shiftChipPaint";
import { groupPositionsByDepartment } from "./groupPositionsByDepartment";
import { bulkShiftPositionFields, shiftDraftRole } from "./shiftDraftRole";
import {
  scheduleBoardIsReadOnly,
  scheduleQueryFailureMode,
  scheduleQueryRecovered,
} from "./scheduleQueryFailure";
import { monthGridRange } from "./monthGrid";
import { translateScheduleReason } from "./translateScheduleReason";

export function runShiftLaunchTests() {
  const unassigned = "Unassigned position";
  assert.equal(shiftDraftRole("  Barista ", unassigned), "Barista");
  assert.equal(shiftDraftRole("", unassigned), unassigned);
  assert.equal(shiftDraftRole("   ", unassigned), unassigned);
  assert.equal(shiftDraftRole(null, unassigned), unassigned);
  assert.notEqual(shiftDraftRole(null, unassigned), "Staff");

  const linked = bulkShiftPositionFields(
    { id: "pos-1", name: "Barista" },
    unassigned,
  );
  assert.equal(linked.role, "Barista");
  assert.equal(linked.position_id, "pos-1");
  assert.deepEqual(bulkShiftPositionFields(null, unassigned), {
    role: unassigned,
    position_id: null,
  });
  assert.deepEqual(
    bulkShiftPositionFields({ id: "pos-2", name: "  " }, unassigned),
    { role: unassigned, position_id: null },
  );

  const groups = groupPositionsByDepartment(
    [
      { id: "b", name: "Closer", department_id: "kitchen" },
      { id: "a", name: "Barista", department_id: "front" },
      { id: "c", name: "Host", department_id: "front" },
      { id: "d", name: "Runner", department_id: null },
      { id: "e", name: "  ", department_id: "front" },
      { id: "f", name: "Porter", department_id: "missing" },
    ],
    [
      { id: "kitchen", name: "Kitchen" },
      { id: "front", name: "Front of house" },
    ],
  );
  assert.deepEqual(
    groups.map((group) => ({
      departmentId: group.departmentId,
      departmentName: group.departmentName,
      names: group.positions.map((position) => position.name),
    })),
    [
      {
        departmentId: "front",
        departmentName: "Front of house",
        names: ["Barista", "Host"],
      },
      {
        departmentId: "kitchen",
        departmentName: "Kitchen",
        names: ["Closer"],
      },
      {
        departmentId: null,
        departmentName: null,
        names: ["Runner"],
      },
      {
        departmentId: "missing",
        departmentName: null,
        names: ["Porter"],
      },
    ],
  );

  assert.equal(
    shiftIsOpen({ assignments: [], required_headcount: 2 }),
    true,
  );
  assert.equal(
    shiftIsOpen({ assignments: [{ id: "a" }], required_headcount: 2 }),
    true,
  );
  assert.equal(
    shiftIsOpen({ assignments: [{ id: "a" }, { id: "b" }], required_headcount: 2 }),
    false,
  );
  assert.equal(shiftIsOpen({ assignments: [], required_headcount: null }), true);
  assert.equal(
    shiftIsOpen({ assignments: [{ id: "a" }], required_headcount: null }),
    false,
  );

  assert.deepEqual(scheduleQueryFailureMode(false), {
    readOnly: true,
    clearBoard: true,
  });
  assert.deepEqual(scheduleQueryFailureMode(true), {
    readOnly: true,
    clearBoard: false,
  });

  assert.equal(
    scheduleBoardIsReadOnly({ status: "error", hasRange: true }),
    true,
  );
  assert.equal(
    scheduleBoardIsReadOnly({ status: "success", hasRange: true }),
    false,
  );
  assert.equal(
    scheduleBoardIsReadOnly({ status: "pending", hasRange: true }),
    false,
  );
  assert.equal(
    scheduleBoardIsReadOnly({ status: "error", hasRange: false }),
    false,
  );
  const unchangedRows = { id: "cached-week" };
  assert.equal(
    scheduleQueryRecovered({
      status: "success",
      hasData: Boolean(unchangedRows),
      dataUpdatedAt: 2_000,
    }),
    true,
  );
  assert.equal(
    scheduleQueryRecovered({
      status: "error",
      hasData: Boolean(unchangedRows),
      dataUpdatedAt: 1_000,
    }),
    false,
  );
  assert.equal(
    scheduleQueryRecovered({
      status: "success",
      hasData: true,
      dataUpdatedAt: 0,
    }),
    false,
  );

  const october = monthGridRange(new Date(2026, 9, 15));
  assert.equal(october.start.getDay(), 0);
  assert.equal(october.start.getMonth(), 8);
  assert.equal(october.start.getDate(), 27);
  assert.equal(october.end.getDay(), 6);
  assert.equal(october.end.getMonth(), 9);
  assert.equal(october.end.getDate(), 31);

  const t = (key: string, options?: Record<string, string>) =>
    options?.hint ? `${key}:${options.hint}` : key;
  assert.equal(
    translateScheduleReason("Invalid shift times", t),
    "schedule.invalidShiftTimes",
  );
  assert.equal(
    translateScheduleReason("Employee is unavailable (Off).", t),
    "schedule.employeeUnavailableHint:Off",
  );
  assert.equal(translateScheduleReason("Custom rule", t), "Custom rule");
}
