import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

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

test("settings stores card loads for owners and blocks table writes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await blockStoreWrites(page);
  await signIn(page);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-stores")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("settings-save-stores")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("store-name")).toBeEnabled();
  await expect(page.getByTestId("store-add")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-stores-owner.png",
    fullPage: true,
  });
});

test("staff do not reach the stores card on settings", async ({ page }) => {
  test.setTimeout(120_000);
  await blockStoreWrites(page);
  await signIn(page);
  await pinStaffProfile(page);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByText("No settings available")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("settings-stores")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/settings-stores-staff-blocked.png",
    fullPage: true,
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

async function blockStoreWrites(page: Page) {
  await page.route("**/rest/v1/stores*", async (route) => {
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
  await page.route("**/api/stores/remap", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 200, body: "{}" });
      return;
    }
    await route.continue();
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
        is_company_admin: false,
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
