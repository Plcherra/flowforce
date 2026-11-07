import assert from "node:assert/strict";
import {
  coffeeShopStarter,
  effectivePermissions,
  emptyOrgSetup,
  orgReady,
  permissionValue,
  withRoleOverride,
} from "./orgTemplates";

const NAMES: Record<string, string> = {
  "onboarding.org.names.foh": "FOH",
  "onboarding.org.names.boh": "BOH",
  "onboarding.org.names.cashier": "Cashier",
  "onboarding.org.names.barista": "Barista",
  "onboarding.org.names.shiftLead": "Shift lead",
  "onboarding.org.names.bakerPrep": "Baker/Prep",
  "onboarding.org.names.manager": "Manager",
};

export function runOrgTemplateTests() {
  const cafe = coffeeShopStarter((key) => NAMES[key] ?? key);
  assert.equal(cafe.businessType, "cafe");
  assert.equal(cafe.start, "template");
  assert.deepEqual(
    cafe.departments.map((department) => ({
      name: department.name,
      roles: department.roles.map((entry) => entry.name),
    })),
    [
      { name: "FOH", roles: ["Cashier", "Barista", "Shift lead"] },
      { name: "BOH", roles: ["Baker/Prep"] },
      { name: "Manager", roles: ["Manager"] },
    ],
  );
  const lead = cafe.departments[0]?.roles[2];
  assert.equal(lead?.level, "manager");
  assert.equal(
    permissionValue(cafe.departments[0]!.permissions, lead?.overrides ?? {}, "schedule.edit"),
    true,
  );
  assert.equal(
    permissionValue(cafe.departments[0]!.permissions, {}, "schedule.edit"),
    false,
  );
  assert.equal(
    permissionValue(cafe.departments[1]!.permissions, {}, "forms.submit"),
    true,
  );
  assert.equal(
    permissionValue(cafe.departments[2]!.permissions, {}, "schedule.edit"),
    true,
  );
  assert.equal(
    effectivePermissions(cafe.departments[0]!.permissions, { "schedule.edit": true })[
      "schedule.edit"
    ],
    true,
  );
  assert.deepEqual(
    withRoleOverride({ "schedule.edit": true }, cafe.departments[0]!.permissions, "schedule.edit", false),
    {},
  );
  assert.equal(orgReady(cafe), true);

  const blank = emptyOrgSetup();
  assert.equal(blank.start, "scratch");
  assert.equal(orgReady(blank), false);
  assert.equal(orgReady({ businessType: "cafe", departments: [] }), false);

  const fallback = coffeeShopStarter((key) => key);
  assert.equal(fallback.departments[0]?.roles[1]?.name, "Barista");
}
