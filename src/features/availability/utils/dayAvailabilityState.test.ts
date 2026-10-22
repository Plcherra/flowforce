import assert from "node:assert/strict";

import {
  FULL_DAY_HOURS,
  hoursFromClockRange,
} from "@/features/availability/utils/availabilityUtils";

import {
  dayAvailabilityState,
  hoursAfterTimeEdit,
  hoursForDayState,
} from "./dayAvailabilityState";

export function runDayAvailabilityStateTests() {
  assert.equal(dayAvailabilityState([]), "unavailable");
  assert.equal(dayAvailabilityState(undefined), "unavailable");
  assert.equal(dayAvailabilityState([...FULL_DAY_HOURS]), "all_day");
  const range = hoursFromClockRange("10:00", "14:00");
  assert.equal(dayAvailabilityState(range), "set_hours");
  assert.deepEqual(hoursForDayState("all_day", "09:00", "17:00"), [...FULL_DAY_HOURS]);
  assert.deepEqual(hoursForDayState("unavailable", "09:00", "17:00"), []);
  assert.deepEqual(hoursForDayState("set_hours", "10:00", "14:00"), range);
  const edited = hoursAfterTimeEdit("11:00", "15:00");
  assert.equal(dayAvailabilityState(edited), "set_hours");
  assert.deepEqual(edited, hoursFromClockRange("11:00", "15:00"));
  assert.notEqual(dayAvailabilityState([]), "set_hours");
  assert.equal(dayAvailabilityState(hoursAfterTimeEdit("11:00", "15:00")), "set_hours");
}
