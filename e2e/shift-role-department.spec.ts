import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const ROLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const DEPT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";
const SHIFT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc01";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("a shift dialog can pick a role and department, and the card shows them", async ({ page }) => {
  await signIn(page);
  await page.route("**/rest/v1/rpc/get_company_roles", async (route) => {
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([
        ...rows,
        {
          id: ROLE_ID,
          name: "Cashier",
          is_active: true,
          hierarchy_level: 1,
          product_level: "staff",
          permissions: {},
        },
      ]),
    });
  });
  await page.route("**/rest/v1/departments*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" || request.method() === "PATCH" || request.method() === "DELETE") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: DEPT_ID, name: "Front" }) });
      return;
    }
    const stamp = new Date().toISOString();
    await appendJson(route, [
      {
        id: DEPT_ID,
        name: "Front of house",
        company_id: "company",
        created_at: stamp,
        updated_at: stamp,
        description: null,
        manager_id: null,
        type: "operations",
      },
    ]);
  });
  await page.route("**/rest/v1/schedules*", async (route) => {
    await appendShift(route);
  });

  await page.goto("/app/enhanced-scheduling");
  const card = page.getByTestId(`schedule-shift-${SHIFT_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByTestId("shift-chip-role")).toHaveText("Cashier");
  await expect(card.getByTestId("shift-chip-department")).toHaveText("Front of house");
  await card.screenshot({ path: "/opt/cursor/artifacts/shift-card-role-department.png" });

  await page.getByTestId("add-shift-control").click();
  await page.getByTestId("create-menu").getByRole("button", { name: "New shift" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("shift-role-select")).toBeVisible();
  await dialog.getByTestId("shift-role-select").click();
  await page.getByRole("option", { name: "Cashier" }).click();
  await dialog.getByTestId("shift-department-select").click();
  await page.getByRole("option", { name: "Front of house" }).click();
  await dialog.screenshot({ path: "/opt/cursor/artifacts/shift-dialog-role-department.png" });
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

async function appendJson(route: Route, extra: unknown[]) {
  const request = route.request();
  if (request.method() !== "GET") {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([...rows, ...extra]),
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
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([
      ...rows,
      {
        id: SHIFT_ID,
        company_id: rows[0] && typeof rows[0] === "object" ? (rows[0] as { company_id?: string }).company_id ?? null : null,
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
        is_published: true,
        is_template: false,
        position_id: null,
        template_id: null,
        status: "scheduled",
        requirements: {
          role_id: ROLE_ID,
          role_name: "Cashier",
          department_id: DEPT_ID,
        },
        hourly_rate: null,
        user_id: null,
      },
    ]),
  });
}
