import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";
import {
  blockScheduleWrites,
  denyScheduleWritesExcept,
  installDeskWeekShiftMock,
} from "./scheduleShiftMock";

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

test("repeat previous week issues a schedules read for the source week", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let scheduleGetsAfterClick = 0;
  await installDeskWeekShiftMock(page);
  await blockScheduleWrites(page);
  await page.route("**/rest/v1/schedules*", async (route) => {
    if (route.request().method() === "GET") {
      scheduleGetsAfterClick += 1;
    }
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
  await signIn(page);
  await openWeekDesk(page);

  await expect(page.getByTestId("repeat-previous-week")).toBeVisible();
  const getsBefore = scheduleGetsAfterClick;
  await page.getByTestId("repeat-previous-week").click();
  await expect.poll(() => scheduleGetsAfterClick > getsBefore, {
    timeout: 30_000,
  }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-desk-copy-week.png" });
});

test("empty this week separates schedule.create from schedule.delete", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockScheduleWrites(page);
  await installDeskWeekShiftMock(page);
  await signIn(page);

  await openWeekDesk(page);
  await expect(page.getByTestId("repeat-previous-week")).toBeVisible();
  await expect(page.getByTestId("empty-this-week")).toBeVisible();

  await denyScheduleWritesExcept(page, ["schedule.create"]);
  await page.reload();
  await openWeekDesk(page);
  await expect(page.getByTestId("repeat-previous-week")).toBeVisible();
  await expect(page.getByTestId("empty-this-week")).toHaveCount(0);

  await denyScheduleWritesExcept(page, ["schedule.delete"]);
  await page.reload();
  await openWeekDesk(page);
  await expect(page.getByTestId("empty-this-week")).toBeVisible();
  await expect(page.getByTestId("repeat-previous-week")).toHaveCount(0);

  let deleteAttempted = false;
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    if (method === "DELETE") {
      deleteAttempted = true;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.getByTestId("empty-this-week").click();
  await expect.poll(() => deleteAttempted, { timeout: 30_000 }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-desk-empty-week.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fenhanced-scheduling");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function openWeekDesk(page: Page) {
  await page.goto("/app/enhanced-scheduling");
  await page.getByRole("button", { name: "Week desk" }).click();
  await expect(page.getByTestId("schedule-week-grid")).toBeVisible({
    timeout: 30_000,
  });
}