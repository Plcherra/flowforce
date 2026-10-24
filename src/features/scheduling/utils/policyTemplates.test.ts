import assert from "node:assert/strict";
import {
  isLevelNamedRole,
  policyTemplateById,
  showPolicyStores,
} from "./policyTemplates";

export function runPolicyTemplateTests() {
  const weekend = policyTemplateById("weekend-time-off");
  assert.ok(weekend);
  assert.deepEqual(weekend.weekdays, [6, 0]);
  assert.equal(weekend.capMonth, 2);
  assert.equal(weekend.capYear, 24);
  assert.equal(weekend.noticeDays, 0);

  const weekday = policyTemplateById("weekday-time-off");
  assert.ok(weekday);
  assert.equal(weekday.noticeDays, 7);
  assert.equal(weekday.capYear, 90);
  assert.deepEqual(weekday.weekdays, [1, 2, 3, 4, 5]);

  assert.equal(showPolicyStores(0), false);
  assert.equal(showPolicyStores(1), false);
  assert.equal(showPolicyStores(2), true);
  assert.equal(isLevelNamedRole("Owner"), true);
  assert.equal(isLevelNamedRole("Cashier"), false);
}
