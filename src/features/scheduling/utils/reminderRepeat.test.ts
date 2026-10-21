import assert from "node:assert/strict";

import {
  clockLabel,
  remindAtForClock,
  repeatLabel,
} from "./reminderRepeat";

export function runReminderRepeatTest() {
  assert.equal(repeatLabel("weekly"), "Weekly");
  assert.equal(repeatLabel("daily"), "Daily");
  assert.equal(repeatLabel("weekdays"), "Weekdays");
  assert.equal(repeatLabel("thursday"), "Thursday");
  assert.equal(repeatLabel(null), "Once");

  const now = new Date("2026-10-21T08:00:00");
  const laterToday = remindAtForClock("09:00", now);
  assert.equal(laterToday.getHours(), 9);
  assert.equal(laterToday.getMinutes(), 0);
  assert.equal(laterToday.getDate(), 21);

  const tomorrow = remindAtForClock("07:00", now);
  assert.equal(tomorrow.getDate(), 22);
  assert.equal(tomorrow.getHours(), 7);
  assert.equal(clockLabel(laterToday.toISOString()), "09:00");
}
