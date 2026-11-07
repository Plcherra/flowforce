import assert from "node:assert/strict";
import {
  effectivePermissions,
  orgReady,
  orgTemplate,
  permissionValue,
  withRoleOverride,
} from "./orgTemplates";

export function runOrgTemplateTests() {
  const cafe = orgTemplate("cafe");
  assert.deepEqual(
    cafe.departments.map((department) => ({
      name: department.name,
      roles: department.roles.map((role) => role.name),
    })),
    [
      { name: "FOH", roles: ["Cashier", "Shift lead"] },
      { name: "BOH", roles: ["Cook"] },
    ],
  );
  const lead = cafe.departments[0]?.roles[1];
  assert.equal(
    permissionValue(cafe.departments[0]!.permissions, lead?.overrides ?? {}, "schedule.edit"),
    true,
  );
  assert.equal(
    permissionValue(cafe.departments[0]!.permissions, {}, "schedule.edit"),
    false,
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
  assert.equal(orgReady({ businessType: "cafe", departments: [] }), false);

  const restaurant = orgTemplate("restaurant");
  assert.equal(restaurant.departments[0]?.roles.some((role) => role.name === "Server"), true);
  const retail = orgTemplate("retail");
  assert.equal(retail.departments[1]?.name, "Stock");
}
