import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const SETTINGS_KEY = "systemSettings" as const;
const DIRECTORY_READ = ["directory.view", "manageUsers"] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || !request.url().includes("language")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const pin = (row: unknown) =>
      row && typeof row === "object"
        ? { ...(row as Record<string, unknown>), language: "en" }
        : row;
    const body = Array.isArray(json) ? json.map(pin) : pin(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("settings activity history uses readable sentences and systemSettings gate", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockSettingsWrites(page);
  await signIn(page);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-activity-history")).toBeVisible({
    timeout: 30_000,
  });

  const rows = page.getByTestId("settings-activity-row");
  const count = await rows.count();
  if (count > 0) {
    const text = await rows.first().innerText();
    expect(text).not.toMatch(/system_settings\.|\.updated/);
    expect(text).not.toMatch(/^[a-z]+\.[a-z_]+$/);
  }

  await denyKeys(page, [SETTINGS_KEY]);
  await page.reload();
  await expect(page.getByTestId("settings-activity-history")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/activity-history-settings.png",
    fullPage: true,
  });
});

test("employee directory hire activity and audit tab stay readable", async ({ page }) => {
  test.setTimeout(180_000);
  await blockSettingsWrites(page);
  await signIn(page);
  await allowKeys(page, [...DIRECTORY_READ]);

  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({ timeout: 30_000 });

  const firstRow = page.locator("table tbody tr").first();
  if ((await firstRow.count()) > 0) {
    await firstRow.click();
    await expect(page.getByTestId("hire-activity")).toBeVisible({ timeout: 20_000 });
    const hireRows = page.getByTestId("hire-activity-row");
    if ((await hireRows.count()) > 0) {
      const line = await hireRows.first().innerText();
      expect(line).not.toMatch(/^hire\./);
    }
    const activityTab = page.getByRole("tab", { name: "Activity" });
    if ((await activityTab.count()) > 0) {
      await activityTab.click();
      await expect(page.getByTestId("user-audit-tab")).toBeVisible({ timeout: 20_000 });
      const auditRows = page.getByTestId("user-audit-row");
      if ((await auditRows.count()) > 0) {
        const auditText = await auditRows.first().innerText();
        expect(auditText).not.toMatch(/user\.role_updated|system_settings/);
      }
    }
  }

  await page.screenshot({
    path: "/opt/cursor/artifacts/activity-history-employee.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockSettingsWrites(page: Page) {
  await page.route("**/rest/v1/system_settings*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

async function denyKeys(page: Page, keys: readonly string[]) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const denySet = new Set(keys);
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return key && !denySet.has(key);
    });
    const denied = keys.map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...denied, ...kept]),
    });
  });
}

async function allowKeys(page: Page, keys: readonly string[]) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const allowSet = new Set(keys);
    const granted = keys.map((key) => ({
      permission_key: key,
      permission_value: "allow",
    }));
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return key && !allowSet.has(key);
    });
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...granted, ...kept]),
    });
  });
}
