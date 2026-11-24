import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MANAGE_KEYS = ["schedule.edit", "editSchedules"] as const;

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

test("personal availability panel shows weekday grid or open notice", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockAvailabilityWrites(page);
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=availability");
  await expect(page.getByTestId("scheduling-panel-sheet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "My availability" })).toBeVisible();

  const openNotice = page.getByTestId("availability-open-notice");
  const weekdayRows = page.getByTestId("availability-weekday-rows");
  await expect(openNotice.or(weekdayRows)).toBeVisible({ timeout: 45_000 });

  if (await weekdayRows.isVisible()) {
    await expect(page.getByTestId("availability-day-mon")).toBeVisible();
    await expect(page.getByTestId("availability-state-legend")).toBeVisible();
  }

  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-availability-personal.png",
  });
});

test("team hours tab and choice editor when schedule edit is granted", async ({ page }) => {
  test.setTimeout(180_000);
  await blockAvailabilityWrites(page);
  await allowKeys(page, MANAGE_KEYS);
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=availability");
  await expect(page.getByTestId("scheduling-panel-sheet")).toBeVisible({
    timeout: 30_000,
  });
  const teamTab = page.getByRole("tab", { name: "Team hours" });
  await expect(teamTab).toBeVisible({ timeout: 30_000 });

  await teamTab.click();
  await expect(page.getByTestId("availability-choice-editor")).toBeVisible({
    timeout: 45_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-availability-team.png",
  });
});

test("team hours tab hides when schedule edit and editSchedules are denied", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockAvailabilityWrites(page);
  await allowKeys(page, MANAGE_KEYS);
  await signIn(page);
  await page.goto("/app/enhanced-scheduling?panel=availability");
  await expect(page.getByRole("tab", { name: "Team hours" })).toBeVisible({
    timeout: 30_000,
  });

  await denyKeys(page, MANAGE_KEYS);
  await page.reload();
  await expect(page.getByTestId("scheduling-panel-sheet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "Team hours" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "My availability" })).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-availability-staff-only.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fenhanced-scheduling%3Fpanel%3Davailability");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockAvailabilityWrites(page: Page) {
  for (const table of [
    "staff_availability",
    "availability_request",
    "availability_exception",
  ] as const) {
    await page.route(`**/rest/v1/${table}*`, async (route) => {
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

async function allowKeys(page: Page, keys: readonly string[]) {
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
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: "allow",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...rows]),
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