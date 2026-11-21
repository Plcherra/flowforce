import { expect, test, type Page, type Route } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PUBLISHED_SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
const DRAFT_SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";

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
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      await route.continue();
      return;
    }
    await appendWeekShifts(route);
  });

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
  await page.route("**/rest/v1/schedules*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await appendWeekShifts(route);
  });

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

async function blockScheduleWrites(page: Page) {
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

const WRITE_KEYS = [
  "schedule.create",
  "schedule.edit",
  "schedule.assign",
  "schedule.delete",
] as const;

async function denyScheduleWritesExcept(page: Page, allow: string[]) {
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !WRITE_KEYS.includes(key as (typeof WRITE_KEYS)[number]);
    });
    const denied = WRITE_KEYS.filter((key) => !allow.includes(key)).map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...denied, ...kept]),
    });
  });
}

async function appendWeekShifts(route: Route) {
  const request = route.request();
  if (!request.url().includes("start_time")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = await readFetchJson(response);
  const rows = Array.isArray(json) ? json : [];
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(15, 0, 0, 0);
  const companyId =
    rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null;
  const extra = [
    shiftRow(PUBLISHED_SHIFT_ID, companyId, start, end, true, "QA published shift"),
    shiftRow(DRAFT_SHIFT_ID, companyId, start, end, false, "QA draft shift"),
  ];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([...rows, ...extra]),
  });
}

function shiftRow(
  id: string,
  companyId: string | null,
  start: Date,
  end: Date,
  isPublished: boolean,
  title: string,
) {
  return {
    id,
    company_id: companyId,
    title,
    role: "Barista",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location: null,
    required_headcount: 1,
    break_minutes: 0,
    color: "#3b82f6",
    timezone: "UTC",
    notes: null,
    created_at: start.toISOString(),
    created_by: null,
    updated_at: null,
    is_all_day: false,
    is_published: isPublished,
    is_template: false,
    position_id: null,
    template_id: null,
    status: isPublished ? "scheduled" : "draft",
    requirements: { role_name: "Barista" },
    hourly_rate: null,
    user_id: null,
  };
}
