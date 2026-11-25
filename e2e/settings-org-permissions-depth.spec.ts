import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const POSITION_KEYS = ["managePositions", "systemSettings"] as const;

const ORG_SETUP = {
  businessType: "cafe" as const,
  departments: [
    {
      id: "e2e-dept-foh",
      name: "FOH",
      permissions: { "schedule.view": true },
      roles: [
        {
          id: "e2e-role-barista",
          name: "Barista",
          level: "staff" as const,
          overrides: {},
        },
      ],
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      return Array.isArray(json) ? json.map(pin) : pin(json);
    });
  });
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("org permissions card loads with café org setup and blocks saves", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let settingsWrite = false;
  await routeOrgSettings(page, () => {
    settingsWrite = true;
  });
  await signIn(page);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("org-permissions-settings")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("FOH", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save permissions" }).click();
  await expect.poll(() => settingsWrite, { timeout: 15_000 }).toBe(true);
  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-org-permissions-depth.png",
  });
});

test("org permissions card hides when managePositions and systemSettings are denied", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await routeOrgSettings(page);
  await signIn(page);
  await denyKeys(page, [...POSITION_KEYS]);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-standard-theme")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("org-permissions-settings")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-org-permissions-denied.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings%3Ftab%3Dgeneral");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function routeOrgSettings(page: Page, onWrite?: () => void) {
  await page.route("**/rest/v1/system_settings*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await fulfillGetWithJson(route, (json) => {
        const rows = Array.isArray(json) ? [...json] : json ? [json] : [];
        if (rows.length === 0) {
          return [{ admin_config: { orgSetup: ORG_SETUP } }];
        }
        return rows.map((row) => {
          if (!row || typeof row !== "object") return row;
          const record = { ...(row as Record<string, unknown>) };
          const config =
            record.admin_config &&
            typeof record.admin_config === "object" &&
            !Array.isArray(record.admin_config)
              ? { ...(record.admin_config as Record<string, unknown>) }
              : {};
          if (!config.orgSetup) config.orgSetup = ORG_SETUP;
          record.admin_config = config;
          return record;
        });
      });
      return;
    }
    onWrite?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
  await page.route("**/rest/v1/company_roles*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await route.continue();
      return;
    }
    onWrite?.();
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
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !keys.includes(key as (typeof keys)[number]);
    });
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}