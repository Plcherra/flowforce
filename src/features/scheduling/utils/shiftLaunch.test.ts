import assert from "node:assert/strict";
import { shiftIsOpen } from "./shiftChipPaint";
import { shiftDraftRole } from "./shiftDraftRole";
import { scheduleQueryFailureMode } from "./scheduleQueryFailure";
import { monthGridRange } from "./monthGrid";
import { translateScheduleReason } from "./translateScheduleReason";

export function runShiftLaunchTests() {
  assert.equal(shiftDraftRole("  Barista "), "Barista");
  assert.equal(shiftDraftRole(""), "Staff");
  assert.equal(shiftDraftRole("   "), "Staff");
  assert.equal(shiftDraftRole(null), "Staff");

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
