import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("manager shift delete is on by default and hidden when the class turns it off", async ({
  page,
}) => {
  await signIn(page);
  await showShiftAsManager(page, false);
  await page.goto("/app/enhanced-scheduling");
  await openShift(page);
  await expect(page.getByTestId("shift-details-actions")).toHaveAttribute(
    "data-can-delete",
    "true",
  );
  await expect(page.getByTestId("delete-shift")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/manager-delete-shift-visible.png",
  });
  await page.getByRole("button", { name: "Close shift details" }).click();
  await page.getByRole("button", { name: "Week desk" }).click();
  await expect(page.getByTestId("empty-this-week")).toBeVisible();
  await page.keyboard.press("Escape");

  await showShiftAsManager(page, true);
  await page.goto("/app/enhanced-scheduling");
  await openShift(page);
  const actions = page.getByTestId("shift-details-actions");
  await expect(actions).toHaveAttribute("data-permissions-ready", "true");
  await expect(actions).toHaveAttribute("data-can-delete", "false");
  await expect(page.getByTestId("delete-shift")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/manager-delete-shift-hidden.png",
  });
  await page.getByRole("button", { name: "Close shift details" }).click();
  await page.getByRole("button", { name: "Week desk" }).click();
  await expect(page.getByTestId("empty-this-week")).toHaveCount(0);
});

test("the owner toggle sends an explicit deny and does not store it", async ({
  page,
}) => {
  const saved: Array<Record<string, unknown>> = [];
  await page.route("**/rest/v1/company_roles*", async (route) => {
    await captureRoleWrite(route, saved);
  });
  await signIn(page);
  await page.goto("/app/sections-permissions");
  await page.getByRole("tab", { name: "Role Configuration" }).click();
  const toggle = page.getByTestId("managers-can-delete-shifts");
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  await expect(toggle).toBeChecked();
  await page.getByTestId("managers-can-delete-shifts-card").screenshot({
    path: "/opt/cursor/artifacts/manager-shift-delete-toggle.png",
  });
  const before = saved.length;
  await toggle.click();
  await expect.poll(() => saved.length).toBeGreaterThan(before);
  for (const body of saved) {
    const permissions = body.permissions as Record<string, unknown>;
    expect(permissions["schedule.delete"]).toBe(false);
  }
});

async function showShiftAsManager(page: Page, denyDelete: boolean) {
  await page.route("**/rest/v1/rpc/get_company_roles", async (route) => {
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const next = rows.map((role) => {
      if (!role || typeof role !== "object") return role;
      return {
        ...(role as Record<string, unknown>),
        product_level: "manager",
        permissions: denyDelete ? { "schedule.delete": false } : {},
      };
    });
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(next),
    });
  });
  await page.route("**/rest/v1/schedules*", async (route) => {
    await appendShift(route);
  });
}

async function openShift(page: Page) {
  const card = page.getByTestId(`schedule-shift-${SHIFT_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId("shift-details-panel")).toBeVisible();
}

async function captureRoleWrite(
  route: Route,
  saved: Array<Record<string, unknown>>,
) {
  const request = route.request();
  if (request.method() !== "PATCH" && request.method() !== "POST") {
    await route.continue();
    return;
  }
  const body = request.postDataJSON() as Record<string, unknown>;
  saved.push(body);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "blocked-write", ...body }),
  });
}

async function appendShift(route: Route) {
  const request = route.request();
  if (request.method() !== "GET" || !request.url().includes("start_time")) {
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
        title: "Morning till",
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
        is_published: false,
        is_template: false,
        position_id: null,
        template_id: null,
        status: "scheduled",
        requirements: {},
        hourly_rate: null,
        user_id: null,
      },
    ]),
  });
}

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
