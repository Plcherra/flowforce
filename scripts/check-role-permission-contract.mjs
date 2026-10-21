import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const contract = JSON.parse(
  readText("src/features/roles/constants/productRoleContract.json"),
);

const registryText = readText("src/lib/permissions/registry.ts");
const moduleText = readText("src/features/roles/constants/modules.ts");
const rolesText = readText("src/features/roles/constants/roles.ts");

const permissionKeys = new Set(
  [...registryText.matchAll(/key:\s*"([^"]+)"/g)].map((match) => match[1]),
);

const fail = (message) => {
  throw new Error(`[roles-contract] ${message}`);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const expectedRoles = ["owner", "admin", "manager", "staff"];
const roleKeys = contract.roles.map((role) => role.key);

assert(
  JSON.stringify(roleKeys) === JSON.stringify(expectedRoles),
  `product roles must be exactly ${expectedRoles.join(", ")}`,
);

assert(
  !moduleText.includes("supervisor:"),
  "module defaults must not include the legacy supervisor product role",
);
assert(
  rolesText.includes("PRODUCT_ROLE_KEYS"),
  "role order must be derived from the product role contract",
);

const expandPermissions = (role) => {
  if (role.permissions.includes("*")) return new Set(permissionKeys);
  return new Set(role.permissions);
};

const permissionsByRole = new Map(
  contract.roles.map((role) => [role.key, expandPermissions(role)]),
);

for (const role of contract.roles) {
  for (const permission of role.permissions) {
    if (permission === "*") continue;
    assert(
      permissionKeys.has(permission),
      `${role.key} references unknown permission ${permission}`,
    );
  }
}

for (const mapping of contract.routePermissionMap) {
  assert(
    Array.isArray(mapping.routes) && mapping.routes.length > 0,
    `${mapping.surface} must map at least one route`,
  );
  assert(
    Array.isArray(mapping.requiredAny) && mapping.requiredAny.length > 0,
    `${mapping.surface} must require at least one permission`,
  );
  for (const permission of mapping.requiredAny) {
    assert(
      permissionKeys.has(permission),
      `${mapping.surface} references unknown permission ${permission}`,
    );
  }
}

const ownerPermissions = permissionsByRole.get("owner");
assert(
  ownerPermissions.size === permissionKeys.size,
  "owner must expand to every registered permission",
);

const adminPermissions = permissionsByRole.get("admin");
for (const permission of [
  "manageUsers",
  "managePositions",
  "admin.roles",
  "admin.permissions",
  "admin.settings",
  "systemSettings",
]) {
  assert(adminPermissions.has(permission), `admin must include ${permission}`);
}

const managerPermissions = permissionsByRole.get("manager");
for (const permission of [
  "systemSettings",
  "admin.roles",
  "admin.permissions",
  "admin.settings",
  "billing.manage",
  "manageUsers",
  "managePositions",
]) {
  assert(
    !managerPermissions.has(permission),
    `manager must not include admin-only permission ${permission}`,
  );
}

const staffPermissions = permissionsByRole.get("staff");
for (const permission of [
  "viewTeamProfiles",
  "editTeamProfiles",
  "viewTeamSchedules",
  "editSchedules",
  "schedule.edit",
  "editTasks",
  "viewTeamExpenses",
  "approveExpenses",
  "approveTimeOff",
  "manageUsers",
  "systemSettings",
  "admin.roles",
  "admin.permissions",
  "admin.settings",
  "inventory.edit",
  "manageInventory",
  "reports.view",
  "billing.view",
]) {
  assert(
    !staffPermissions.has(permission),
    `staff default pack must not include elevated permission ${permission}`,
  );
}

const grantableExtras = contract.levelGrantableExtras ?? {};
const staffGrantable = new Set([
  ...staffPermissions,
  ...(grantableExtras.staff ?? []),
]);
for (const permission of grantableExtras.staff ?? []) {
  assert(
    permissionKeys.has(permission),
    `staff grantable extra references unknown permission ${permission}`,
  );
}
for (const permission of [
  "viewTeamSchedules",
  "schedule.view",
  "viewTeamProfiles",
]) {
  assert(
    staffGrantable.has(permission),
    `staff ceiling must allow owner to grant ${permission}`,
  );
}
for (const permission of [
  "approveTimeOff",
  "billing.manage",
  "admin.settings",
  "schedule.grant",
  "schedule.create",
  "schedule.delete",
]) {
  assert(
    !staffGrantable.has(permission),
    `staff ceiling must not allow ${permission}`,
  );
}
for (const permission of ["editSchedules", "schedule.edit"]) {
  assert(
    staffGrantable.has(permission),
    `staff ceiling must allow ${permission} to be turned on for that person`,
  );
}

assert(
  !contract.starterClasses || contract.starterClasses.length === 0,
  "extra starter packs are removed; create only from system roles",
);
assert(
  !contract.operatorBoxHiddenKeys || contract.operatorBoxHiddenKeys.length === 0,
  "hidden permission keys are not allowed",
);
assert(
  !contract.operatorBoxBaselineKeys || contract.operatorBoxBaselineKeys.length === 0,
  "baseline keys must sit on a visible area",
);

const operatorVerbs = ["see", "edit", "create_delete"];
const operatorAreas = contract.operatorAreas ?? [];
const expectedAreaKeys = [
  "profile",
  "my_schedule",
  "team_schedule",
  "my_tasks",
  "run_lists",
  "expenses",
  "time_off",
  "inventory",
  "reports",
  "ai",
  "team",
  "settings",
];
assert(
  JSON.stringify(operatorAreas.map((area) => area.key)) ===
    JSON.stringify(expectedAreaKeys),
  `operator areas must be exactly ${expectedAreaKeys.join(", ")}`,
);

const areaKeyOwners = new Map();
for (const area of operatorAreas) {
  assert(area.label, `${area.key} must have a restaurant-facing label`);
  assert(area.verbs && typeof area.verbs === "object", `${area.key} needs verbs`);
  const lockedVerbs = area.owner_locked_verbs ?? [];
  for (const verb of lockedVerbs) {
    assert(
      operatorVerbs.includes(verb),
      `${area.key} locks unknown verb ${verb}`,
    );
  }
  for (const verb of operatorVerbs) {
    const keys = area.verbs[verb] ?? [];
    assert(Array.isArray(keys), `${area.key}.${verb} must be an array`);
    for (const permission of keys) {
      assert(
        permissionKeys.has(permission),
        `${area.key}.${verb} references unknown permission ${permission}`,
      );
      assert(
        !areaKeyOwners.has(permission),
        `${permission} cannot belong to both ${areaKeyOwners.get(permission)} and ${area.key}.${verb}`,
      );
      areaKeyOwners.set(permission, `${area.key}.${verb}`);
    }
  }
  assert(
    operatorVerbs.some((verb) => (area.verbs[verb] ?? []).length > 0),
    `${area.key} must map at least one permission`,
  );
}

const classified = new Set(areaKeyOwners.keys());
for (const permission of permissionKeys) {
  assert(
    classified.has(permission),
    `permission ${permission} is missing from the operator area map`,
  );
}

const teamSchedule = operatorAreas.find((area) => area.key === "team_schedule");
assert(
  teamSchedule.verbs.see.some((permission) => staffGrantable.has(permission)),
  "Staff ceiling must allow See on team schedule",
);
assert(
  teamSchedule.verbs.edit
    .filter(
      (permission) =>
        permission !== "editSchedules" && permission !== "schedule.edit",
    )
    .every((permission) => !staffGrantable.has(permission)),
  "Staff ceiling must not allow schedule grant or reminder keys",
);
assert(
  teamSchedule.verbs.create_delete.every(
    (permission) => !staffGrantable.has(permission),
  ),
  "Staff ceiling must not allow Create / delete on team schedule",
);
const settingsArea = operatorAreas.find((area) => area.key === "settings");
assert(
  operatorVerbs
    .flatMap((verb) => settingsArea.verbs[verb] ?? [])
    .every((permission) => !staffGrantable.has(permission)),
  "Staff ceiling must not allow Settings",
);
assert(
  JSON.stringify(settingsArea.owner_locked_verbs ?? []) ===
    JSON.stringify(["see", "edit", "create_delete"]),
  "Settings stays on for Owner",
);
const teamArea = operatorAreas.find((area) => area.key === "team");
assert(
  JSON.stringify(teamArea.owner_locked_verbs ?? []) ===
    JSON.stringify(["edit", "create_delete"]),
  "Team edit and create/delete stay on for Owner",
);

console.log(
  `OK role permission contract: ${contract.roles.length} roles, ${operatorAreas.length} operator areas, ${permissionKeys.size} registered permissions`,
);
