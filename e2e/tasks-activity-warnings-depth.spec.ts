import { expect, test, type Page } from "@playwright/test";
import { format, subDays } from "date-fns";
import { missingE2eEnv } from "./required-env";

const OVERDUE_TASK_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee76";
const ACTIVITY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa76";

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

test("all tasks shows execution warnings and mocked activity feed", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockTaskWrites(page);
  await installOverdueTask(page);
  await installMockActivity(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();

  await expect(page.getByTestId("tasks-warnings")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("tasks-warnings").getByRole("button", { name: /Overdue task E2E overdue/ }),
  ).toBeVisible();
  await page
    .getByTestId("tasks-warnings")
    .getByRole("button", { name: /Overdue task E2E overdue/ })
    .click();
  await expect(page.getByTestId("task-details-dialog")).toBeVisible({
    timeout: 20_000,
  });
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("tasks-below-list")).toBeVisible();
  await expect(page.getByTestId("task-activity-feed")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(`task-activity-row-${ACTIVITY_ID}`)).toBeVisible();
  await expect(
    page
      .getByTestId(`task-activity-row-${ACTIVITY_ID}`)
      .getByText("E2E activity depth description"),
  ).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/tasks-activity-warnings-depth.png",
  });
});

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

async function blockTaskWrites(page: Page) {
  const patterns = [
    "**/rest/v1/tasks*",
    "**/rest/v1/task_comments*",
    "**/rest/v1/task_reminders*",
    "**/rest/v1/task_activities*",
  ];
  for (const pattern of patterns) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(method === "DELETE" ? null : []),
      });
    });
  }
}

async function installOverdueTask(page: Page) {
  const overdueDue = format(subDays(new Date(), 3), "yyyy-MM-dd");
  let companyId: string | null = null;
  await page.unroute("**/rest/v1/tasks*").catch(() => undefined);
  await page.route("**/rest/v1/tasks*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    const url = decodeURIComponent(route.request().url());
    const isList =
      url.includes("/tasks?") &&
      !url.includes(`id=eq.${OVERDUE_TASK_ID}`) &&
      !url.includes("id=in.");
    if (!isList) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const sample = rows[0] as { company_id?: string } | undefined;
    companyId =
      sample?.company_id ??
      companyId ??
      url.match(/company_id=eq\.([^&]+)/)?.[1] ??
      null;
    const now = new Date().toISOString();
    const fixture = {
      id: OVERDUE_TASK_ID,
      title: "E2E overdue task depth",
      description: null,
      status: "todo",
      priority: "high",
      assigned_to: "00000000-0000-4000-8000-000000000076",
      created_by: "00000000-0000-4000-8000-000000000076",
      goal_id: "00000000-0000-4000-8000-000000000077",
      due_date: overdueDue,
      estimated_hours: null,
      actual_hours: null,
      attachments: null,
      completed_at: null,
      created_at: now,
      links: null,
      parent_task_id: null,
      origin_event_id: null,
      tags: null,
      source: "custom",
      company_id: companyId,
      updated_at: now,
      kind: "custom",
    };
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([fixture]),
    });
  });
}

async function installMockActivity(page: Page) {
  const stamp = new Date().toISOString();
  await page.unroute("**/rest/v1/task_activities*").catch(() => undefined);
  await page.route("**/rest/v1/task_activities*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "blocked for e2e" }),
      });
      return;
    }
    const companyMatch = decodeURIComponent(request.url()).match(
      /company_id=eq\.([^&]+)/,
    );
    const companyId = companyMatch?.[1] ?? "00000000-0000-4000-8000-00000000aa";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: ACTIVITY_ID,
          task_id: OVERDUE_TASK_ID,
          user_id: "00000000-0000-4000-8000-000000000076",
          action_type: "task_updated",
          description: "E2E activity depth description",
          metadata: { task_title: "E2E overdue task depth" },
          created_at: stamp,
          company_id: companyId,
          actor: { first_name: "Playwright", last_name: "QA" },
        },
      ]),
    });
  });
}