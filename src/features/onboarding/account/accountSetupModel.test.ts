import assert from "node:assert/strict";
import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import {
  accessLevelFor,
  departmentsProblem,
  enabledJobRoles,
  industryForBusinessType,
  onboardingRecordsFromWorkspace,
  permissionsForRole,
  roleOverridesDepartment,
  setDepartmentPermission,
  setRolePermission,
  signupProblem,
  staffChecks,
  starterListSettings,
  storeProblem,
  templateFor,
  type AccountWorkspaceInput,
} from "./accountSetupModel";

function workspace(): AccountWorkspaceInput {
  const departments = templateFor("restaurant").map((department) => ({
    ...department,
    name: department.key === "foh" ? "FOH" : "BOH",
    roles: department.roles.map((role) => ({
      ...role,
      name: role.key,
    })),
  }));
  return {
    businessType: "restaurant",
    timezone: "Europe/Lisbon",
    locale: "en",
    departments,
    store: { name: "Rua", opens: "08:00", closes: "22:00" },
    starter: "skip",
    starterCopy: {
      openingTitle: "Opening list",
      closingTitle: "Closing list",
      openingItems: ["Unlock"],
      closingItems: ["Lock"],
      shiftTitle: "First shift",
    },
  };
}

export function runAccountSetupModelTests() {
  const restaurant = templateFor("restaurant");
  assert.deepEqual(
    restaurant.map((department) => department.key),
    ["foh", "boh"],
  );
  assert.deepEqual(
    restaurant[0]?.roles.map((role) => role.key),
    ["cashier", "server"],
  );
  assert.deepEqual(templateFor("cafe")[0]?.roles.map((role) => role.key), [
    "barista",
    "cashier",
  ]);
  assert.equal(industryForBusinessType("cafe"), "Food & Beverage");
  assert.equal(industryForBusinessType("retail"), "Retail");

  const foh = restaurant[0];
  assert.ok(foh);
  const cashier = foh.roles[0];
  assert.ok(cashier);
  assert.equal(roleOverridesDepartment(foh, cashier), false);
  const raised = setRolePermission(foh, "cashier", "scheduleEdit", true);
  const raisedCashier = raised.roles.find((role) => role.key === "cashier");
  const server = raised.roles.find((role) => role.key === "server");
  assert.ok(raisedCashier);
  assert.ok(server);
  assert.equal(roleOverridesDepartment(raised, raisedCashier), true);
  assert.equal(server.permissions.scheduleEdit, false);
  assert.equal(accessLevelFor(raisedCashier.permissions), "manager");
  assert.equal(accessLevelFor(server.permissions), "staff");

  const nextDefault = setDepartmentPermission(raised, "formsSubmit", false);
  const stillRaised = nextDefault.roles.find((role) => role.key === "cashier");
  const followed = nextDefault.roles.find((role) => role.key === "server");
  assert.equal(stillRaised?.permissions.scheduleEdit, true);
  assert.equal(followed?.permissions.formsSubmit, false);
  assert.equal(stillRaised?.permissions.formsSubmit, false);

  const records = onboardingRecordsFromWorkspace(workspace());
  const names = records.customRoles.map((role) => role.name);
  assert.ok(names.includes("Owner"));
  assert.ok(names.includes("cashier"));
  assert.equal(
    records.customRoles.find((role) => role.name === "cashier")?.is_system_role,
    false,
  );
  const cashierPermissions = permissionsForRole("staff", staffChecks());
  assert.equal(cashierPermissions["forms.submit"], true);
  assert.equal(cashierPermissions["schedule.edit"], false);
  assert.equal(enabledJobRoles(workspace()).length, 4);

  assert.equal(
    signupProblem({ firstName: "A", lastName: "B", email: "a@b.com", password: "short" }),
    "password",
  );
  assert.equal(departmentsProblem([{ key: "foh", defaults: staffChecks(), roles: [] }]), "role");
  assert.equal(storeProblem({ name: "Rua", opens: "08:00", closes: "08:00" }), "store");

  const settings = starterListSettings("role-1", "2026-11-07T08:00:00.000Z", "2026-11-07T10:00:00.000Z");
  const distribution = readFormDistribution(settings);
  assert.equal(distribution.recordKind, "list");
  assert.deepEqual(distribution.roleIds, ["role-1"]);
}
