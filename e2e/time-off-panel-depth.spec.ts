import { expect, test, type Page } from "@playwright/test";
import { format, addDays } from "date-fns";
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

test("my time off panel tiles and request dialog fields with blocked submit", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let submitAttempted = false;
  await blockTimeOffWrites(page, () => {
    submitAttempted = true;
  });
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=timeoff");
  await expect(
    page.getByRole("heading", { name: "My time off", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("Balance remaining", { exact: true })).toBeVisible();
  await expect(page.getByText("Requested", { exact: true })).toBeVisible();
  await expect(page.getByText("Weekly availability", { exact: true })).toBeVisible();
  await expect(page.getByText("Coverage impact", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Request history", { exact: true }),
  ).toBeVisible();

  await page.getByTestId("time-off-request-btn").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Submit time off request" })).toBeVisible();

  await expect(dialog.locator("#timeoff-type")).toBeVisible();
  await expect(dialog.locator("#timeoff-start")).toBeVisible();
  await expect(dialog.locator("#timeoff-end")).toBeVisible();
  await expect(dialog.locator("#timeoff-reason")).toBeVisible();

  const start = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 16), "yyyy-MM-dd");
  await dialog.locator("#timeoff-start").fill(start);
  await dialog.locator("#timeoff-end").fill(end);
  await dialog.locator("#timeoff-reason").fill("E2E panel depth");
  await dialog.getByRole("button", { name: "Submit request" }).click();
  await expect.poll(() => submitAttempted, { timeout: 15_000 }).toBe(true);

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-panel-depth.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fenhanced-scheduling%3Fpanel%3Dtimeoff");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockTimeOffWrites(page: Page, onWrite?: () => void) {
  await page.route("**/rest/v1/time_off_requests*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
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