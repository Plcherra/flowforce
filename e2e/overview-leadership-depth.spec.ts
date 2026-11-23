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

test("leadership overview shows coverage and list-status widgets for managers", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("role-overview")).toBeVisible({ timeout: 30_000 });

  const leadership = await page.getByTestId("role-overview").getAttribute("data-leadership");
  if (leadership !== "true") {
    test.skip(true, "Test user is not leadership; coverage widgets are manager-only.");
  }

  await expect(page.getByTestId("overview-coverage")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("overview-list-status")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("overview-my-shift")).toBeVisible();
  await expect(page.getByTestId("overview-my-lists")).toBeVisible();
  await expect(page.getByTestId("overview-company-updates")).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/overview-leadership-depth.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}