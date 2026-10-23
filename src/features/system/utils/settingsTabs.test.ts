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
  assert.equal(hrefs.includes("/settings"), false);
  assert.equal(hrefs.includes("/app/settings"), false);
  assert.equal(
    navigationItems.some((item) => item.href === "/admin" || item.name === "Admin"),
    false,
  );
  assert.equal(
    navigationItems.some(
      (item) =>
        item.name === "Settings" ||
        item.href === "/settings" ||
        item.href === "/app/settings",
    ),
    false,
  );

  const accountCluster = readWorkspaceFile("src/app-shell/layout/AccountCluster.tsx");
  assert.equal(accountCluster.includes('navigate("/app/settings")'), true);
  assert.equal(accountCluster.includes("data-testid=\"account-cluster\""), true);

  const teamDirectory = readWorkspaceFile(
    "src/features/employees/components/TeamDirectory.tsx",
  );
  assert.equal(/settings/i.test(teamDirectory), false);
  assert.equal(
    readWorkspaceFile("src/features/employees/types/directory.ts").includes(
      '"settings"',
    ),
    false,
  );

  const redirects = [
    ...readWorkspaceFile("next.config.mjs").matchAll(
      /source:\s*'([^']+)',\s*destination:\s*'([^']+)'/g,
    ),
  ].map((match) => ({ source: match[1], destination: match[2] }));
  for (const source of [
    "/settings",
    "/settings/:path*",
    "/admin/settings",
    "/admin/settings/:path*",
    "/app/admin/settings",
    "/app/admin/settings/:path*",
  ]) {
    assert.equal(
      redirects.find((redirect) => redirect.source === source)?.destination,
      "/app/settings",
      `${source} should open profile-card settings`,
    );
  }
  assert.equal(
    redirects.find((redirect) => redirect.source === "/admin")?.destination,
    "/app/employees",
  );
  assert.equal(
    redirects.find((redirect) => redirect.source === "/app/admin")?.destination,
    "/app/employees",
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
