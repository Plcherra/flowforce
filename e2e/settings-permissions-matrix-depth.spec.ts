import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const SETTINGS_KEY = "systemSettings" as const;

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
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("permissions matrix search, module toggles, and systemSettings gate", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockRoleWrites(page);
  await signIn(page);

  await page.goto("/app/sections-permissions?tab=permissions");
  await expect(page.getByTestId("section-permissions-matrix")).toBeVisible({
    timeout: 30_000,
  });

  const search = page.getByTestId("permission-matrix-search");
  await expect(search).toBeVisible();

  await search.fill("Scheduling");
  await expect(page.getByTestId("permission-matrix-module-scheduling")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("permission-matrix-module-workspace")).toHaveCount(0);

  await search.fill("zzzz-no-modules");
  await expect(page.getByTestId("permission-matrix-no-modules")).toBeVisible();
  await search.fill("");

  await page.getByRole("button", { name: "Staff" }).click();
  const teamToggle = page.getByTestId("permission-toggle-staff-team");
  await expect(teamToggle).toBeVisible({ timeout: 15_000 });
  const wasChecked = await teamToggle.isChecked();
  await teamToggle.click();
  await expect(teamToggle).toBeChecked({ checked: !wasChecked });
  await expect(page.getByText("Unsaved", { exact: true }).first()).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-matrix-toggle.png",
  });

  await denyKeys(page, [SETTINGS_KEY]);
  await pinStaffProfile(page);
  await page.reload();
  await expect(page.getByTestId("sections-access-denied")).toBeVisible({
    timeout: 30_000,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsections-permissions");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockRoleWrites(page: Page) {
  for (const pattern of ["**/rest/v1/company_roles*", "**/rest/v1/system_settings*"]) {
    await page.route(pattern, async (route) => {
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

async function pinStaffProfile(page: Page) {
  await page.unroute("**/rest/v1/profiles*").catch(() => undefined);
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const demote = (row: unknown) => {
      if (!row || typeof row !== "object") return row;
      return {
        ...(row as Record<string, unknown>),
        role: "staff",
        language: "en",
      };
    };
    const body = Array.isArray(json) ? json.map(demote) : demote(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}