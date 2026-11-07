import assert from "node:assert/strict";
import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import {
  blankOrg,
  orgTemplate,
  permissionValue,
  withRoleOverride,
} from "@/features/onboarding/utils/orgTemplates";
import {
  enabledJobRoles,
  onboardingRecordsFromWorkspace,
  signupProblem,
  starterListSettings,
  storeProblem,
  type AccountWorkspaceInput,
} from "./accountSetupModel";

function workspace(): AccountWorkspaceInput {
  return {
    timezone: "Europe/Lisbon",
    locale: "en",
    org: orgTemplate(),
    store: { name: "Rua", opens: "08:00", closes: "22:00" },
    starter: "lists",
    starterCopy: {
      shiftTitle: "First shift",
      lists: [{ key: "opening", title: "Opening list", items: ["Unlock"] }],
    },
  };
}

export function runAccountSetupModelTests() {
  const shop = orgTemplate();
  assert.equal(shop.businessType, "cafe");
  assert.deepEqual(
    shop.departments.map((department) => department.id),
    ["foh", "boh"],
  );
  assert.deepEqual(
    shop.departments[0]?.roles.map((role) => role.name),
    ["Cashier", "Shift lead"],
  );
  assert.equal(shop.departments[1]?.roles[0]?.name, "Cook");
  assert.equal(blankOrg().departments[0]?.name, "");
  assert.equal(blankOrg().departments[0]?.roles[0]?.name, "");

  const floor = shop.departments[0];
  const lead = floor?.roles[1];
  assert.ok(floor);
  assert.ok(lead);
  assert.equal(
    permissionValue(floor.permissions, {}, "schedule.edit"),
    false,
  );
  assert.equal(
    permissionValue(floor.permissions, lead.overrides, "schedule.edit"),
    true,
  );
  const cleared = withRoleOverride(lead.overrides, floor.permissions, "schedule.edit", false);
  assert.equal(cleared["schedule.edit"], undefined);

  const records = onboardingRecordsFromWorkspace(workspace());
  const names = records.customRoles.map((role) => role.name);
  assert.ok(names.includes("Owner"));
  assert.ok(names.includes("Cashier"));
  assert.ok(names.includes("Cook"));
  assert.equal(
    records.customRoles.find((role) => role.name === "Cashier")?.is_system_role,
    false,
  );
  assert.equal(enabledJobRoles(workspace()).length, 3);
  assert.equal(
    signupProblem({ firstName: "A", lastName: "B", email: "a@b.com", password: "short" }),
    "password",
  );
  assert.equal(storeProblem({ name: "Rua", opens: "08:00", closes: "08:00" }), "store");

  const settings = starterListSettings(
    "role-1",
    "2026-11-07T08:00:00.000Z",
    "2026-11-07T10:00:00.000Z",
  );
  const distribution = readFormDistribution(settings);
  assert.equal(distribution.recordKind, "list");
  assert.deepEqual(distribution.roleIds, ["role-1"]);
}
