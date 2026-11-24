import { expect, test, type Page } from "@playwright/test";
import { format, addDays } from "date-fns";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const HISTORY_REQUEST_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee70";

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

test("my time off history lists mocked personal request with status", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockTimeOffWrites(page);
  await signIn(page);
  const userId = await userIdFromStorage(page);
  await installPersonalHistory(page, userId);

  await page.goto("/app/enhanced-scheduling?panel=timeoff");
  await expect(
    page.getByRole("heading", { name: "My time off", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  const history = page.getByTestId("time-off-history-list");
  await expect(history).toBeVisible({ timeout: 30_000 });
  await expect(history.getByText(/E2E my history depth/)).toBeVisible();
  await expect(history.getByTestId("time-off-request-status")).toContainText(
    /approved/i,
  );

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-my-history-depth.png",
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

async function userIdFromStorage(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(
      (name) => name.startsWith("sb-") && name.endsWith("-auth-token"),
    );
    if (!key) return "";
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as { user?: { id?: string } };
      return parsed.user?.id ?? "";
    } catch {
      return "";
    }
  });
}

async function installPersonalHistory(page: Page, userId: string) {
  const start = format(addDays(new Date(), -14), "yyyy-MM-dd");
  const end = format(addDays(new Date(), -12), "yyyy-MM-dd");
  const now = new Date().toISOString();
  await page.unroute("**/rest/v1/time_off_requests*").catch(() => undefined);
  await page.route("**/rest/v1/time_off_requests*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const hasFixture = rows.some(
      (row) =>
        row &&
        typeof row === "object" &&
        (row as { id?: string }).id === HISTORY_REQUEST_ID,
    );
    if (!hasFixture && userId) {
      rows.unshift({
        id: HISTORY_REQUEST_ID,
        status: "approved",
        type: "vacation",
        start_date: start,
        end_date: end,
        reason: "E2E my history depth",
        notes: null,
        user_id: userId,
        company_id: null,
        created_at: now,
        updated_at: now,
        approved_by: null,
        approved_at: now,
        policy_id: null,
      });
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}

async function blockTimeOffWrites(page: Page) {
  await page.route("**/rest/v1/time_off_requests*", async (route) => {
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