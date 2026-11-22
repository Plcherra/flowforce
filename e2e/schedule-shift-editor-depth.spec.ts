import { expect, test, type Page, type Route } from "@playwright/test";
import { setHours, setMinutes } from "date-fns";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
const WRITE_KEYS = [
  "schedule.create",
  "schedule.edit",
  "schedule.assign",
  "schedule.delete",
] as const;

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

test("shift details sheet shows editor fields on details, tasks, and templates tabs", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await installWeekShiftMock(page, { blockWrites: true });

  const schedulesReady = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/rest/v1/schedules") &&
      response.url().includes("start_time"),
    { timeout: 60_000 },
  );

  await page.goto("/app/enhanced-scheduling");
  await schedulesReady;

  await openShiftFromWeekGrid(page, SHIFT_ID);

  const panel = page.getByTestId("shift-details-panel");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("shift-details-not-found")).toHaveCount(0);

  await expect(panel.locator("#title")).toHaveValue("QA editor shift");
  await expect(panel.getByTestId("shift-role-select")).toBeVisible();
  await expect(panel.getByTestId("shift-department-select")).toBeVisible();
  await expect(panel.locator("#start_time")).toBeVisible();
  await expect(panel.locator("#end_time")).toBeVisible();
  await expect(panel.locator("#location")).toBeVisible();
  await expect(panel.locator("#hourly_rate")).toBeVisible();
  await expect(panel.locator("#notes")).toBeVisible();
  await expect(panel.getByTestId("employee-selector-add")).toBeVisible();
  await expect(panel.getByTestId("shift-detail-role")).toContainText("Barista");
  await expect(panel.getByTestId("shift-details-actions")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Save changes" })).toBeVisible();

  await panel.getByRole("tab", { name: "Tasks" }).click();
  await expect(panel.getByTestId("shift-linked-forms")).toBeVisible();
  await expect(panel.getByTestId("shift-tasks-panel")).toBeVisible();

  await panel.getByRole("tab", { name: "Templates" }).click();
  await expect(
    panel.getByRole("button", { name: "Save as shift template" }),
  ).toBeVisible();
  await expect(panel.locator("#shift-template")).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-shift-editor-depth.png",
  });
});

test("assign-only keeps assignment UI but hides save and delete in shift details", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await denyScheduleWritesExcept(page, ["schedule.assign"]);
  await installWeekShiftMock(page);

  await page.goto("/app/enhanced-scheduling");
  await page
    .waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/rest/v1/schedules") &&
        response.url().includes("start_time"),
      { timeout: 60_000 },
    )
    .catch(() => undefined);

  await openShiftFromWeekGrid(page, SHIFT_ID);

  const panel = page.getByTestId("shift-details-panel");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByTestId("employee-selector-add")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(panel.getByTestId("delete-shift")).toHaveCount(0);
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

async function openShiftFromWeekGrid(page: Page, shiftId: string) {
  const card = page.getByTestId(`schedule-shift-${shiftId}`);
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.getByTestId("shift-details-not-found")).toHaveCount(0, {
    timeout: 5_000,
  });
}

async function installWeekShiftMock(
  page: Page,
  options?: { blockWrites?: boolean },
) {
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      if (options?.blockWrites) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
        return;
      }
      await route.continue();
      return;
    }
    const url = route.request().url();
    if (!url.includes("start_time")) {
      await route.continue();
      return;
    }
    await appendEditorShift(route);
  });
}

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

function weekShiftWindow() {
  const day = new Date();
  const start = setMinutes(setHours(day, 9), 0);
  const end = setMinutes(setHours(day, 15), 0);
  return { start, end };
}

async function appendEditorShift(route: Route) {
  const response = await route.fetch();
  const json = await readFetchJson(response);
  const rows = Array.isArray(json) ? json : [];
  const { start, end } = weekShiftWindow();
  const companyId =
    rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null;
  const extra = {
    id: SHIFT_ID,
    company_id: companyId,
    title: "QA editor shift",
    role: "Barista",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location: "Front counter",
    required_headcount: 1,
    break_minutes: 0,
    color: "#3b82f6",
    timezone: "UTC",
    notes: "E2E shift editor",
    created_at: start.toISOString(),
    created_by: null,
    updated_at: null,
    is_all_day: false,
    is_published: true,
    is_template: false,
    position_id: null,
    template_id: null,
    status: "scheduled",
    requirements: { role_name: "Barista" },
    hourly_rate: null,
    user_id: null,
  };
  const merged = [...rows.filter((row) => (row as { id?: string }).id !== SHIFT_ID), extra];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify(merged),
  });
}