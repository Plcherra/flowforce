import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("directory search, tabs, and clear-filters empty state", async ({ page }) => {
  test.setTimeout(180_000);
  await blockInviteWrites(page);
  await signIn(page);

  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("directory-search")).toBeVisible({ timeout: 20_000 });

  const tableVisible = await page
    .getByTestId("directory-status")
    .first()
    .isVisible()
    .catch(() => false);
  const emptyRoster = await page.getByTestId("employees-empty-state").isVisible().catch(() => false);

  if (!tableVisible && !emptyRoster) {
    await expect(page.locator("table").first()).toBeVisible({ timeout: 30_000 });
  }

  await page.getByTestId("directory-search").fill("zzzz-qa-no-match-e2e");
  const filterEmpty = page.getByText("No teammates match these filters");
  await expect(filterEmpty).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(filterEmpty).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId("directory-search")).toHaveValue("");

  await page.getByRole("tab", { name: /Leads/i }).click();
  await page.getByRole("tab", { name: /Inactive/i }).click();
  await page.getByRole("tab", { name: /All/i }).click();

  await page.screenshot({ path: "/opt/cursor/artifacts/employees-directory-depth.png", fullPage: true });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Femployees");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockInviteWrites(page: Page) {
  await page.route("**/rest/v1/company_invites*", async (route) => {
    if (route.request().method() === "GET") {
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