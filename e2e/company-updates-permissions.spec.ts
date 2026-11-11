import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MANAGE_KEYS = [
  "updates.manage",
  "systemSettings",
  "admin.settings",
] as const;

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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("company updates page loads and updates.manage gates the new button", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await blockUpdateWrites(page);

  await page.goto("/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Updates", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Search updates")).toBeVisible();
  await expect(page.getByRole("button", { name: "Feed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Grid" })).toBeVisible();
  await expect(page.getByRole("button", { name: "List" })).toBeVisible();

  const newUpdate = page.getByTestId("company-updates-new");
  await expect(newUpdate).toBeVisible({ timeout: 20_000 });
  await newUpdate.click();
  await expect(page.getByRole("heading", { name: "Create company update" })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/company-updates-wizard.png" });

  await pinStaffRole(page);
  await denyManageKeys(page);
  await page.reload();
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("company-updates-new")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/company-updates-no-manage.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fcompany-updates");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockUpdateWrites(page: Page) {
  await page.route("**/rest/v1/company_updates*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
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

async function pinStaffRole(page: Page) {
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const demote = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        return {
          ...(row as Record<string, unknown>),
          role: "staff",
          language: "en",
        };
      };
      return Array.isArray(json) ? json.map(demote) : demote(json);
    });
  });
}

async function denyManageKeys(page: Page) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? json : [];
      const kept = rows.filter((row) => {
        const key =
          row && typeof row === "object"
            ? (row as { permission_key?: string }).permission_key
            : "";
        return !MANAGE_KEYS.includes(key as (typeof MANAGE_KEYS)[number]);
      });
      const denied = MANAGE_KEYS.map((key) => ({
        permission_key: key,
        permission_value: "deny",
      }));
      return [...denied, ...kept];
    });
  });
}
