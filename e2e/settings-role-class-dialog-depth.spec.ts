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

test("role class edit dialog walks basic and access tabs without saving", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockRoleWrites(page);
  await signIn(page);

  await page.goto("/app/sections-permissions?tab=roles");
  await expect(page.getByTestId("role-configuration-tab")).toBeVisible({
    timeout: 30_000,
  });

  const editButton = page.locator('[data-testid^="role-class-edit-"]').first();
  await expect(editButton).toBeVisible({ timeout: 20_000 });
  await editButton.click();

  const dialog = page.getByTestId("role-management-dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole("heading", { name: "Edit class" })).toBeVisible();
  await expect(dialog.locator("#name")).not.toHaveValue("");

  await dialog.getByRole("tab", { name: "Access" }).click();
  await expect(dialog.getByTestId("operator-access-grid")).toBeVisible({
    timeout: 20_000,
  });

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByTestId("role-create-class").click();
  await expect(page.getByTestId("role-management-dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create class" }),
  ).toBeVisible();
  await page.getByTestId("role-management-dialog").locator("#name").fill("E2E unsaved class");
  await page
    .getByTestId("role-management-dialog")
    .getByRole("button", { name: "Cancel" })
    .click();

  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-role-class-dialog-depth.png",
  });
});

test("role configuration hides from staff without systemSettings", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockRoleWrites(page);
  await signIn(page);
  await denyKeys(page, [SETTINGS_KEY]);
  await pinStaffProfile(page);

  await page.goto("/app/sections-permissions?tab=roles");
  await expect(page.getByTestId("sections-access-denied")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("role-configuration-tab")).toHaveCount(0);
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
  await page.route("**/rest/v1/company_roles*", async (route) => {
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
  await page.route("**/rest/v1/companies*", async (route) => {
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
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !keys.includes(key);
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