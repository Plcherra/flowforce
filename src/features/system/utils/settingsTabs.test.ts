import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SETTINGS_CONTROL_GATES,
  SETTINGS_TAB_KEYS,
  collectNavigationHrefs,
} from "./settingsTabs";

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function runSettingsTabTests() {
  assert.equal(
    SETTINGS_TAB_KEYS.includes("admin" as (typeof SETTINGS_TAB_KEYS)[number]),
    false,
  );
  assert.equal(SETTINGS_TAB_KEYS.includes("billing"), true);

  const navigationSource = readWorkspaceFile("src/data/navigationData.tsx");
  const navigationItems = [
    ...navigationSource.matchAll(
      /name:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"/g,
    ),
  ].map((match) => ({ name: match[1], href: match[2] }));
  const hrefs = collectNavigationHrefs([{ items: navigationItems }]);
  assert.equal(hrefs.includes("/admin"), false);
  assert.equal(
    navigationItems.some((item) => item.href === "/admin" || item.name === "Admin"),
    false,
  );
  assert.equal(readWorkspaceFile("src/features/system/pages/SettingsPage.tsx").includes('key: "admin"'), false);

  assert.equal(SETTINGS_CONTROL_GATES.billing.tab, "billing");
  assert.equal(SETTINGS_CONTROL_GATES.billing.permission, "billing.manage");
  assert.equal(SETTINGS_CONTROL_GATES.export.permission, "systemSettings");
  assert.equal(SETTINGS_CONTROL_GATES.audit.permission, "systemSettings");
  assert.equal(SETTINGS_CONTROL_GATES.danger.permission, "systemSettings");
  assert.equal(SETTINGS_CONTROL_GATES.userManagement.permission, "manageUsers");
  assert.equal(
    SETTINGS_CONTROL_GATES.userManagement.surface,
    "employee-directory",
  );
}
