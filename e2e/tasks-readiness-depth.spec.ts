import { expect, test, type Page } from "@playwright/test";
import { format, subDays } from "date-fns";
import { missingE2eEnv } from "./required-env";

const OVERDUE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc62";
const UNASSIGNED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd62";

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

test("readiness chips filter overdue and unassigned tasks", async ({ page }) => {
  test.setTimeout(180_000);
  await injectReadinessTasks(page);
  await blockTaskNotificationWrites(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-readiness-counts")).toBeVisible({
    timeout: 30_000,
  });

  const overdueChip = page.getByTestId("tasks-readiness-overdue");
  const unassignedChip = page.getByTestId("tasks-readiness-unassigned");
  await expect(overdueChip.locator(".tabular-nums")).toHaveText("1");
  await expect(unassignedChip.locator(".tabular-nums")).toHaveText("1");

  await overdueChip.click();
  await expect(overdueChip).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`task-card-${OVERDUE_ID}`)).toBeVisible();
  await expect(page.getByTestId(`task-card-${UNASSIGNED_ID}`)).toHaveCount(0);

  await unassignedChip.click();
  await expect(page.getByTestId(`task-card-${UNASSIGNED_ID}`)).toBeVisible();
  await expect(page.getByTestId(`task-card-${OVERDUE_ID}`)).toHaveCount(0);

  await unassignedChip.click();
  await expect(unassignedChip).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId(`task-card-${OVERDUE_ID}`)).toBeVisible();
  await expect(page.getByTestId(`task-card-${UNASSIGNED_ID}`)).toBeVisible();

  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-readiness-depth.png" });
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

function taskRow(
  id: string,
  title: string,
  dueDate: string | null,
  assignedTo: string | null,
) {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description: "QA readiness depth",
    status: "todo",
    priority: "medium",
    assigned_to: assignedTo,
    created_by: "00000000-0000-4000-8000-000000000001",
    goal_id: null,
    due_date: dueDate,
    estimated_hours: null,
    actual_hours: null,
    attachments: null,
    completed_at: null,
    created_at: now,
    links: null,
    parent_task_id: null,
    origin_event_id: null,
    tags: null,
    source: "manual",
    company_id: null,
    updated_at: now,
  };
}

async function blockTaskNotificationWrites(page: Page) {
  await page.route("**/rest/v1/task_notifications*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        method === "POST"
          ? { id: "e2e-blocked-task-notification" }
          : [],
      ),
    });
  });
}

async function injectReadinessTasks(page: Page) {
  const overdueDue = format(subDays(new Date(), 2), "yyyy-MM-dd");
  const fixtures = [
    taskRow(OVERDUE_ID, "E2E overdue readiness", overdueDue, "00000000-0000-4000-8000-000000000099"),
    taskRow(UNASSIGNED_ID, "E2E unassigned readiness", null, null),
  ];
  await page.route("**/rest/v1/tasks*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixtures),
    });
  });
}