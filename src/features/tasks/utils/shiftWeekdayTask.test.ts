import assert from "node:assert/strict";
import {
  US_FOODS_DELIVERY,
  matchesWeekday,
  readShiftWeekdayTask,
  withShiftWeekdayTask,
} from "./shiftWeekdayTask";

export function runShiftWeekdayTaskTests() {
  assert.equal(US_FOODS_DELIVERY.slot, null);
  assert.equal(US_FOODS_DELIVERY.area, "supervisor");
  assert.deepEqual(US_FOODS_DELIVERY.weekdays, ["mon", "wed", "fri"]);
  assert.deepEqual(US_FOODS_DELIVERY.stations, [
    "front_of_house",
    "back_of_house",
  ]);
  assert.equal(matchesWeekday(US_FOODS_DELIVERY, "mon"), true);
  assert.equal(matchesWeekday(US_FOODS_DELIVERY, "wed"), true);
  assert.equal(matchesWeekday(US_FOODS_DELIVERY, "fri"), true);
  assert.equal(matchesWeekday(US_FOODS_DELIVERY, "tue"), false);

  const links = withShiftWeekdayTask({ form_id: "keep" }, US_FOODS_DELIVERY);
  const stored = readShiftWeekdayTask(links);
  assert.deepEqual(stored, US_FOODS_DELIVERY);
  assert.equal(stored?.slot, null);
  assert.equal((links as { form_id?: string }).form_id, "keep");
}
