import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assignmentsForDraft,
  draftFromPolicy,
  exampleKeepsOpenEdit,
  policyIsOpen,
} from "./policyDraft";
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
  archivedAt: null,
  assignments: [{ targetType: "company", targetId: "company-1" }],
};

function assertArchivedAtColumn() {
  const source = readFileSync(
    path.resolve(process.cwd(), "src/integrations/supabase/types.ts"),
    "utf8",
  );
  const policyStart = source.indexOf("company_policies:");
  const assignmentStart = source.indexOf("company_policy_assignments:");
  assert.ok(policyStart >= 0 && assignmentStart > policyStart);
  const policyBlock = source.slice(policyStart, assignmentStart);
  assert.match(policyBlock, /archived_at:\s*string \| null/);
}

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

  const selected = assignmentsForDraft({
    companyId: "company-1",
    roleIds: [],
    userIds: ["person-a", "person-a"],
    levelKeys: [],
    storeIds: [],
  });
  assert.deepEqual(selected, [{ targetType: "user", targetId: "person-a" }]);

  const everyone = assignmentsForDraft({
    companyId: "company-1",
    roleIds: [],
    userIds: [],
    levelKeys: [],
    storeIds: [],
  });
  assert.deepEqual(everyone, [{ targetType: "company", targetId: "company-1" }]);
  assert.equal(
    everyone.some((assignment) => assignment.targetId === "everyone"),
    false,
  );

  assert.equal(policyIsOpen(weekend), true);
  assert.equal(
    policyIsOpen({ ...weekend, archivedAt: "2026-10-22T17:42:04.000Z" }),
    false,
  );
  assertArchivedAtColumn();
}
