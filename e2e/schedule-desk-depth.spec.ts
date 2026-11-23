import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";
import {
  DRAFT_SHIFT_ID,
  PUBLISHED_SHIFT_ID,
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

test("week desk grid shows draft vs published and publish issues a blocked write", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await blockScheduleWrites(page);
  await installDeskWeekShiftMock(page);

  await page.goto("/app/enhanced-scheduling");
  await page.getByRole("button", { name: "Week desk" }).click();
  await expect(page.getByTestId("publish-to-team")).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId(`schedule-shift-${PUBLISHED_SHIFT_ID}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(`schedule-shift-${DRAFT_SHIFT_ID}`)).toBeVisible();
  await expect(page.getByTestId("schedule-week-grid")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-week-grid-depth.png" });

  let publishAttempted = false;
  await page.route("**/rest/v1/rpc/publish_schedules_week_with_validation", async (route) => {
    publishAttempted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, blocking_count: 0 }),
    });
  });

  await page.getByTestId("publish-to-team").click();
  await expect.poll(() => publishAttempted, { timeout: 15_000 }).toBe(true);

  await page.getByTestId(`schedule-shift-${PUBLISHED_SHIFT_ID}`).click();
  await expect(page.getByTestId("shift-details-panel")).toBeVisible();
  await expect(page.getByTestId("employee-selector-add")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-shift-assign-panel.png" });
});

test("assign-only opens week grid assignment without desk publish controls", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await denyScheduleWritesExcept(page, ["schedule.assign"]);
  await installDeskWeekShiftMock(page);

  await page.goto("/app/enhanced-scheduling");
  await expect(page.getByTestId("add-shift-control")).toHaveCount(0);
  const card = page.getByTestId(`schedule-shift-${PUBLISHED_SHIFT_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId("employee-selector-add")).toBeVisible();
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