import assert from "node:assert/strict";
import { getProductRolePermissions } from "./productRoles";
import {
  DIRECTORY_GRANT_RIGHT,
  DIRECTORY_VIEW_KEY,
  canGrantDirectoryView,
  directoryGrantChange,
  seesEmployeeDirectory,
} from "./permissionGrant";

export function runPermissionGrantTests() {
  const manager = getProductRolePermissions("manager");
  const admin = getProductRolePermissions("admin");
  const staff = getProductRolePermissions("staff");

  assert.equal(manager[DIRECTORY_VIEW_KEY], true);
  assert.equal(admin[DIRECTORY_VIEW_KEY], true);
  assert.equal(Boolean(staff[DIRECTORY_VIEW_KEY]), false);

  assert.equal(
    seesEmployeeDirectory({ level: "manager", hierarchyLevel: 1 }),
    true,
  );
  assert.equal(
    seesEmployeeDirectory({ level: "admin", hierarchyLevel: 1 }),
    true,
  );
  assert.equal(
    seesEmployeeDirectory({ level: "staff", hierarchyLevel: 4 }),
    false,
  );

  assert.equal(
    seesEmployeeDirectory({
      level: "staff",
      hierarchyLevel: 1,
      overrides: [
        { permission_key: DIRECTORY_VIEW_KEY, permission_value: "allow" },
      ],
    }),
    true,
  );
  assert.equal(
    seesEmployeeDirectory({
      level: "manager",
      hierarchyLevel: 4,
      overrides: [
        { permission_key: DIRECTORY_VIEW_KEY, permission_value: "deny" },
      ],
    }),
    false,
  );

  assert.equal(canGrantDirectoryView({ level: "owner", hierarchyLevel: 1 }), true);
  assert.equal(
    canGrantDirectoryView({ level: "manager", overrides: [] }),
    false,
  );
  assert.equal(
    canGrantDirectoryView({
      level: "staff",
      overrides: [
        { permission_key: DIRECTORY_VIEW_KEY, permission_value: "allow" },
      ],
    }),
    false,
  );

  const ownerGrant = directoryGrantChange({
    actorLevel: "owner",
    allowDirectory: true,
    grantTheRight: true,
  });
  assert.ok(ownerGrant);
  assert.equal(
    ownerGrant.some(
      (row) =>
        row.permission_key === DIRECTORY_VIEW_KEY &&
        row.permission_value === "allow",
    ),
    true,
  );
  assert.equal(
    ownerGrant.some(
      (row) =>
        row.permission_key === DIRECTORY_GRANT_RIGHT &&
        row.permission_value === "allow",
    ),
    true,
  );

  assert.equal(
    seesEmployeeDirectory({ level: "staff", overrides: ownerGrant }),
    true,
  );
  assert.equal(
    canGrantDirectoryView({ level: "staff", overrides: ownerGrant }),
    true,
  );

  const passedOn = directoryGrantChange({
    actorLevel: "staff",
    actorOverrides: ownerGrant,
    allowDirectory: true,
    grantTheRight: true,
  });
  assert.ok(passedOn);
  assert.equal(
    passedOn.some((row) => row.permission_key === DIRECTORY_GRANT_RIGHT),
    true,
  );

  assert.equal(
    directoryGrantChange({
      actorLevel: "manager",
      allowDirectory: true,
      grantTheRight: false,
    }),
    null,
  );
}
