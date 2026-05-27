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
    `staff must not include elevated permission ${permission}`,
  );
}

console.log(
  `OK role permission contract: ${contract.roles.length} roles, ${permissionKeys.size} registered permissions`,
);
