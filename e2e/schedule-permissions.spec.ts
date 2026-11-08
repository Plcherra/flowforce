import { expect, test, type Page, type Route } from "@playwright/test";
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

test("schedule desk, shift form, and the four write permissions stay independent", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    await appendShift(route);
  });

  await page.goto("/app/enhanced-scheduling");
  await expect(page.getByRole("button", { name: "Week desk" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Barista Morning")).toHaveCount(0);
  await expect(page.getByText("Cook Morning")).toHaveCount(0);

  await openDesk(page);
  await expect(page.getByTestId("publish-to-team")).toBeVisible();
  await expect(page.getByTestId("return-to-draft")).toBeVisible();
  await expect(page.getByTestId("repeat-previous-week")).toBeVisible();
  await expect(page.getByTestId("empty-this-week")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-desk-owner.png" });
  await page.getByTestId("role-templates").click();
  await expect(page.getByRole("heading", { name: "Role Templates" })).toBeVisible();
  await expect(page.getByText("Barista Morning")).toHaveCount(0);
  await expect(page.getByText("Cook Morning")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByTestId("add-shift-control").click();
  await page.getByTestId("create-menu").getByRole("button", { name: "New shift" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("label[for='shift-department']")).toHaveText("Department");
  await expect(dialog.getByText("Class", { exact: true })).toHaveCount(0);
  await expect(dialog.getByTestId("shift-role-select")).toBeVisible();
  await expect(dialog.getByTestId("shift-department-select")).toBeVisible();
  await dialog.getByRole("tab", { name: "Tasks" }).click();
  await expect(dialog.getByTestId("shift-tasks-panel")).toBeVisible();
  await dialog.screenshot({ path: "/opt/cursor/artifacts/schedule-shift-form.png" });
  await page.keyboard.press("Escape");

  await showOnly(page, ["schedule.edit"]);
  await page.reload();
  await openDesk(page);
  await expect(page.getByTestId("publish-to-team")).toBeVisible();
  await expect(page.getByTestId("add-shift-control")).toHaveCount(0);
  await expect(page.getByTestId("empty-this-week")).toHaveCount(0);
  await expect(page.getByTestId("repeat-previous-week")).toHaveCount(0);

  await showOnly(page, ["schedule.create"]);
  await page.reload();
  await expect(page.getByTestId("add-shift-control")).toBeVisible();
  await openDesk(page);
  await expect(page.getByTestId("repeat-previous-week")).toBeVisible();
  await expect(page.getByTestId("publish-to-team")).toHaveCount(0);
  await expect(page.getByTestId("empty-this-week")).toHaveCount(0);

  await showOnly(page, ["schedule.delete"]);
  await page.reload();
  await openDesk(page);
  await expect(page.getByTestId("empty-this-week")).toBeVisible();
  await expect(page.getByTestId("add-shift-control")).toHaveCount(0);
  await expect(page.getByTestId("publish-to-team")).toHaveCount(0);

  await showOnly(page, ["schedule.assign"]);
  await page.reload();
  const card = page.getByTestId(`schedule-shift-${SHIFT_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId("employee-selector-add")).toBeVisible();
  await expect(page.getByTestId("delete-shift")).toHaveCount(0);
  await expect(page.getByTestId("add-shift-control")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/schedule-assign-only.png" });
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

async function openDesk(page: Page) {
  await page.getByRole("button", { name: "Week desk" }).click();
}

async function showOnly(page: Page, allow: string[]) {
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

async function appendShift(route: Route) {
  const request = route.request();
  if (!request.url().includes("start_time")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(15, 0, 0, 0);
  const companyId =
    rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null;
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([
      ...rows,
      {
        id: SHIFT_ID,
        company_id: companyId,
        title: "QA morning shift",
        role: "Cashier",
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
        is_published: true,
        is_template: false,
        position_id: null,
        template_id: null,
        status: "scheduled",
        requirements: { role_name: "Cashier" },
        hourly_rate: null,
        user_id: null,
      },
    ]),
  });
}
