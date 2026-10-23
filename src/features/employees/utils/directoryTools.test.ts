import assert from "node:assert/strict";
import { directoryTools } from "./directoryTools";

function allow(keys: string[]) {
  const granted = new Set(keys);
  return (key: string) => granted.has(key);
}

export function runDirectoryToolsTests() {
  const none = directoryTools(allow([]));
  assert.equal(none.wholeStore, false);
  assert.equal(none.vendors, false);
  assert.equal(none.addVendor, false);
  assert.equal(none.invitations, false);
  assert.equal(none.roles, false);
  assert.equal(none.permissions, false);

  const store = directoryTools(allow(["directory.view"]));
  assert.equal(store.wholeStore, true);
  assert.equal(store.vendors, false);
  assert.equal(store.invitations, false);

  const vendors = directoryTools(
    allow(["directory.view", "inventory.view"]),
  );
  assert.equal(vendors.vendors, true);
  assert.equal(vendors.addVendor, false);

  const addVendor = directoryTools(
    allow(["inventory.view", "inventory.create"]),
  );
  assert.equal(addVendor.vendors, true);
  assert.equal(addVendor.addVendor, true);

  const invites = directoryTools(allow(["manageUsers"]));
  assert.equal(invites.invitations, true);
  assert.equal(invites.roles, false);

  const roles = directoryTools(allow(["admin.roles"]));
  assert.equal(roles.roles, true);
  const manage = directoryTools(allow(["directory.manage"]));
  assert.equal(manage.roles, true);

  const permissions = directoryTools(allow(["admin.permissions"]));
  assert.equal(permissions.permissions, true);
  assert.equal(permissions.invitations, false);

  const reports = directoryTools(allow(["reports.view", "reports.export"]));
  assert.equal(reports.wholeStore, false);
  assert.equal(reports.vendors, false);
  assert.equal(reports.invitations, false);

  assert.deepEqual(
    Object.keys(directoryTools(allow(["systemSettings", "admin.settings"]))).sort(),
    [
      "addVendor",
      "invitations",
      "permissions",
      "roles",
      "vendors",
      "wholeStore",
    ],
  );
}
