import assert from "node:assert/strict";
import { draftFromPolicy, exampleKeepsOpenEdit } from "./policyDraft";
import type { CompanyPolicyRecord } from "./companyPolicy";

const weekend: CompanyPolicyRecord = {
  id: "weekend-id",
  companyId: "company-1",
  name: "Weekend",
  type: "time_off",
  unit: "days",
  capWeek: null,
  capMonth: 2,
  capYear: 24,
  eligibleWeekdays: [6, 0],
  noticeDays: 0,
  assignments: [{ targetType: "company", targetId: "company-1" }],
};

export function runPolicyDraftTests() {
  const draft = draftFromPolicy(weekend);
  assert.equal(draft.id, "weekend-id");
  assert.equal(draft.capWeek, null);
  assert.equal(draft.capMonth, 2);
  assert.equal(draft.capYear, 24);
  assert.deepEqual(draft.eligibleWeekdays, [6, 0]);
  assert.equal(draft.noticeDays, 0);
  assert.equal(exampleKeepsOpenEdit("Weekend", "Weekend"), true);
  assert.equal(exampleKeepsOpenEdit("Weekend", "Weekday"), false);
  assert.equal(exampleKeepsOpenEdit(null, "Weekend"), false);
}
