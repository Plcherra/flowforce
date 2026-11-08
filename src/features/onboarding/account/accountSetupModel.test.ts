import assert from "node:assert/strict";
import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import {
  coffeeShopStarter,
  emptyOrgSetup,
  permissionValue,
  withRoleOverride,
} from "@/features/onboarding/utils/orgTemplates";
import {
  enabledJobRoles,
  onboardingRecordsFromWorkspace,
  signupProblem,
  signupRedirectForExistingAccount,
  starterListSettings,
  storeProblem,
  type AccountWorkspaceInput,
} from "./accountSetupModel";

function shopNames(key: string) {
  const names: Record<string, string> = {
    "onboarding.org.names.foh": "FOH",
    "onboarding.org.names.boh": "BOH",
    "onboarding.org.names.cashier": "Cashier",
    "onboarding.org.names.barista": "Barista",
    "onboarding.org.names.shiftLead": "Shift lead",
    "onboarding.org.names.bakerPrep": "Baker/Prep",
    "onboarding.org.names.manager": "Manager",
  };
  return names[key] ?? key;
}

function workspace(): AccountWorkspaceInput {
  return {
    timezone: "Europe/Lisbon",
    locale: "en",
    org: coffeeShopStarter(shopNames),
    store: { name: "Rua", opens: "08:00", closes: "22:00" },
    stores: [],
    starter: "lists",
    starterCopy: {
      shiftTitle: "First shift",
      lists: [{ key: "opening", title: "Opening list", items: ["Unlock"] }],
    },
  };
}

export function runAccountSetupModelTests() {
  const shop = coffeeShopStarter(shopNames);
  assert.equal(shop.businessType, "cafe");
  assert.deepEqual(
    shop.departments.map((department) => department.roles.map((role) => role.name)),
    [["Cashier", "Barista", "Shift lead"], ["Baker/Prep"], ["Manager"]],
  );
  assert.equal(emptyOrgSetup().departments.length, 0);
  assert.equal(shop.departments.some((department) => department.roles.some((role) => role.name === "Cook")), false);

  const floor = shop.departments[0];
  const lead = floor?.roles[2];
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
  assert.ok(names.includes("Barista"));
  assert.ok(names.includes("Baker/Prep"));
  assert.ok(names.includes("Manager"));
  assert.equal(names.includes("Cook"), false);
  assert.equal(
    records.customRoles.find((role) => role.name === "Cashier")?.is_system_role,
    false,
  );
  assert.equal(enabledJobRoles(workspace()).length, 5);
  assert.equal(
    signupProblem({ firstName: "A", lastName: "B", email: "a@b.com", password: "short" }),
    "password",
  );
  assert.equal(storeProblem({ name: "Rua", opens: "08:00", closes: "08:00" }), "store");
  assert.equal(
    signupRedirectForExistingAccount({
      inviteToken: "token",
      companyId: null,
      role: null,
    }),
    "/auth?invite=token",
  );
  assert.equal(
    signupRedirectForExistingAccount({
      inviteToken: null,
      companyId: "shop",
      role: "employee",
    }),
    "/app/onboarding",
  );
  assert.equal(
    signupRedirectForExistingAccount({
      inviteToken: null,
      companyId: "shop",
      role: "owner",
    }),
    "/app/dashboard",
  );
  assert.equal(
    signupRedirectForExistingAccount({
      inviteToken: null,
      companyId: null,
      role: "owner",
    }),
    null,
  );

  const settings = starterListSettings(
    "role-1",
    "2026-11-07T08:00:00.000Z",
    "2026-11-07T10:00:00.000Z",
  );
  const distribution = readFormDistribution(settings);
  assert.equal(distribution.recordKind, "list");
  assert.deepEqual(distribution.roleIds, ["role-1"]);
}
