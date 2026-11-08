import assert from "node:assert/strict";
import { templateShiftWindow } from "./templateShiftWindow";

export function runTemplateShiftWindowTests() {
  const day = new Date(2026, 10, 8, 12, 0, 0, 0);
  const sameDay = templateShiftWindow(day, "09:00", "16:30");
  assert.equal(sameDay.startTime.getHours(), 9);
  assert.equal(sameDay.startTime.getMinutes(), 0);
  assert.equal(sameDay.endTime.getHours(), 16);
  assert.equal(sameDay.endTime.getMinutes(), 30);
  assert.equal(sameDay.endTime.getDate(), 8);

  const overnight = templateShiftWindow(day, "18:00", "01:30");
  assert.equal(overnight.endTime.getDate(), 9);
  assert.equal(overnight.endTime.getHours(), 1);
  assert.equal(overnight.endTime.getMinutes(), 30);
}
