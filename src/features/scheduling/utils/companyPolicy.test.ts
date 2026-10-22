import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  companyPolicyFromTimeOffRow,
  policyMatchesSubject,
  type PolicySubject,
} from "./companyPolicy";

const newbie: PolicySubject = {
  userId: "new-user",
  roleId: "role-1",
  level: "staff",
  locationId: "store-1",
  companyId: "company-1",
};

function assertGeneratedCompanyPolicyTypes() {
  const source = readFileSync(
    path.resolve(process.cwd(), "src/integrations/supabase/types.ts"),
    "utf8",
  );
  const policyStart = source.indexOf("company_policies:");
  const assignmentStart = source.indexOf("company_policy_assignments:");
  assert.ok(policyStart >= 0, "generated company_policies type");
  assert.ok(assignmentStart >= 0, "generated company_policy_assignments type");
  const policyBlock = source.slice(policyStart, assignmentStart);
  const assignmentBlock = source.slice(assignmentStart, assignmentStart + 700);
  assert.match(policyBlock, /type:\s*string/);
  assert.match(assignmentBlock, /target_type:\s*string/);
}

export function runCompanyPolicyTests() {
  const mapped = companyPolicyFromTimeOffRow({
    id: "policy-1",
    companyId: "company-1",
    name: "Weekend",
    unit: "days",
    capWeek: 1,
    capMonth: 2,
    capYear: 24,
    eligibleWeekdays: [0, 6],
    noticeDays: 0,
    appliesToRoleIds: ["role-1", "role-1"],
    appliesToUserIds: ["user-1"],
  });
  assert.equal(mapped.id, "policy-1");
  assert.equal(mapped.type, "time_off");
  assert.equal(mapped.capWeek, 1);
  assert.equal(mapped.capMonth, 2);
  assert.equal(mapped.capYear, 24);
  assert.deepEqual(mapped.assignments, [
    { targetType: "role", targetId: "role-1" },
    { targetType: "user", targetId: "user-1" },
  ]);

  const companyWide = companyPolicyFromTimeOffRow({
    id: "policy-2",
    companyId: "company-1",
    name: "Weekday",
    unit: "days",
    capWeek: null,
    capMonth: null,
    capYear: 90,
    eligibleWeekdays: [1, 2, 3, 4, 5],
    noticeDays: 7,
    appliesToRoleIds: [],
    appliesToUserIds: [],
  });
  assert.deepEqual(companyWide.assignments, [
    { targetType: "company", targetId: "company-1" },
  ]);
  assert.equal(companyWide.capYear, 90);

  assert.equal(
    policyMatchesSubject([{ targetType: "role", targetId: "role-1" }], newbie),
    true,
  );
  assert.equal(
    policyMatchesSubject([{ targetType: "level", targetId: "staff" }], newbie),
    true,
  );
  assert.equal(
    policyMatchesSubject([{ targetType: "store", targetId: "store-1" }], newbie),
    true,
  );
  assert.equal(
    policyMatchesSubject([{ targetType: "company", targetId: "company-1" }], newbie),
    true,
  );
  assert.equal(
    policyMatchesSubject([{ targetType: "user", targetId: "someone-else" }], newbie),
    false,
  );

  assertGeneratedCompanyPolicyTypes();
}
