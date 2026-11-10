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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("profile page opens overview and security tabs", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/profile");
  await expect(page.getByTestId("profile-settings-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
  await page.getByRole("tab", { name: "Security" }).click();
  await expect(page.getByText("Permanent account deletion")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/profile-account-page.png",
    fullPage: true,
  });
});

test("personal language shows Save only after changing the select", async ({ page }) => {
  test.setTimeout(120_000);
  await blockProfileWrites(page);
  await signIn(page);

  await page.goto("/app/settings?tab=localization");
  await expect(page.getByTestId("personal-language")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("personal-language-save")).toHaveCount(0);
  await page.getByTestId("personal-language").click();
  await page.getByRole("option", { name: "Español" }).click();
  await expect(page.getByTestId("personal-language-save")).toBeVisible();
  await page.getByTestId("personal-language-save").click();
});

test("notification settings panel loads for signed-in owner", async ({ page }) => {
  test.setTimeout(120_000);
  await blockSettingsWrites(page);
  await signIn(page);

  await page.goto("/app/settings?tab=notifications");
  await expect(page.getByTestId("notification-settings-panel")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "Delivery channels" })).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/profile-notifications-gate.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fprofile");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockProfileWrites(page: Page) {
  await page.route("**/rest/v1/profiles*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ language: "es" }),
    });
  });
}

async function blockSettingsWrites(page: Page) {
  await page.route("**/rest/v1/system_settings*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}
