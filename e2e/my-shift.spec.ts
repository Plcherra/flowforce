import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const ROLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OPEN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("My Shift on tasks shows published role lists without Draft closing notes", async ({
  page,
}) => {
  await signIn(page);
  const userId = await userIdFromStorage(page);

  await page.route("**/rest/v1/schedules*", async (route) => {
    await fulfillShift(route, userId);
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    await appendForms(route);
  });
  await page.route("**/rest/v1/company_roles*", async (route) => {
    await appendRole(route);
  });
  await page.route("**/rest/v1/form_submissions*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.continue();
  });

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-shift").click();
  await expect(page.getByTestId("my-shift-tasks")).toBeVisible({ timeout: 20_000 });
  const list = page.getByTestId(`my-shift-role-list-${OPEN_ID}`);
  await expect(list).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
  await list.screenshot({ path: "/opt/cursor/artifacts/my-shift-qa-list.png" });
});

test("dashboard My Shift card is visible and highlighted", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("overview-my-shift")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("overview-my-shift")).toHaveClass(/bg-primary\/5/);
  await page.getByTestId("overview-my-shift").screenshot({
    path: "/opt/cursor/artifacts/my-shift-overview-card.png",
  });
});

async function userIdFromStorage(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(
      (name) => name.startsWith("sb-") && name.endsWith("-auth-token"),
    );
    if (!key) return "";
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { user?: { id?: string } };
    return parsed.user?.id ?? "";
  });
}

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Ftasks");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

function audience() {
  return {
    kind: "company",
    user_ids: [] as string[],
    position_ids: [] as string[],
    role_ids: [] as string[],
    department_ids: [] as string[],
  };
}

function formRow(id: string, title: string, roleIds: string[], dueAt: string) {
  return {
    id,
    title,
    status: "published",
    settings: {
      distribution: {
        record_kind: "list",
        role_ids: roleIds,
        fill_audience: audience(),
        see_audience: audience(),
        show_from: null,
        due_at: dueAt,
      },
    },
  };
}

async function fulfillShift(route: Route, userId: string) {
  const request = route.request();
  if (request.method() !== "GET" || !request.url().includes("is_template")) {
    await route.continue();
    return;
  }
  const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        role: "E2E Barista",
        title: "E2E morning",
        start_time: start,
        end_time: end,
        user_id: userId,
        is_published: true,
        is_template: false,
        position_id: null,
      },
    ]),
  });
}

async function appendForms(route: Route) {
  const request = route.request();
  if (request.method() !== "GET" || !request.url().includes("settings")) {
    await route.continue();
    return;
  }
  if (request.url().includes("createdprofile")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([
      ...rows,
      formRow(OPEN_ID, "E2E Barista list", [ROLE_ID], "2099-01-01T00:00:00.000Z"),
    ]),
  });
}

async function appendRole(route: Route) {
  const request = route.request();
  if (request.method() !== "GET") {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  if (!Array.isArray(json)) {
    await route.fulfill({ response });
    return;
  }
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([
      ...json,
      { id: ROLE_ID, name: "E2E Barista", hierarchy_level: 1 },
    ]),
  });
}
