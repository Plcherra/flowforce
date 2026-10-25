import assert from "node:assert/strict";
import { shiftChipPaint } from "./shiftChipPaint";

export function runShiftChipPaintTests() {
  const assigned = shiftChipPaint("#f59e0b", "assigned");
  assert.equal(assigned.opaque, true);
  assert.equal(assigned.backgroundColor, "rgb(245, 158, 11)");
  assert.match(assigned.borderLeft, /^8px solid rgb\(/);

  const open = shiftChipPaint("#3b82f6", "unassigned");
  assert.equal(open.opaque, false);
  assert.notEqual(open.backgroundColor, "rgb(59, 130, 246)");
  assert.match(open.backgroundColor, /^rgb\(/);
  assert.equal(open.borderLeft, "8px solid rgb(59, 130, 246)");
  assert.equal(open.color, "#1f2937");

  const pale = shiftChipPaint("#fde68a", "assigned");
  assert.equal(pale.color, "#1f2937");

  const fallback = shiftChipPaint("not-a-color", "assigned");
  assert.equal(fallback.backgroundColor, "rgb(59, 130, 246)");
}
