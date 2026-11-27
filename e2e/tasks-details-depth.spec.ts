import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const DETAIL_TASK_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa62";
const DETAIL_TASK_TITLE = "e2e task details depth";
const EDIT_TASKS_KEY = "editTasks" as const;

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

test("task details dialog: workflow, timeline, comments, and blocked writes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let writeAttempts = 0;
  await installDepthTask(page, () => {
    writeAttempts += 1;
  });
  await blockTaskCommentWrites(page, () => {
    writeAttempts += 1;
  });
  await signIn(page);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-view-section")).toBeVisible({
    timeout: 20_000,
  });

  const card = page.getByTestId(`task-card-${DETAIL_TASK_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  const dialog = page.getByTestId("task-details-dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });

  await expect(dialog.getByTestId("task-details-actions")).toBeVisible();
  await expect(dialog.getByTestId("task-details-complete")).toBeVisible();
  await expect(dialog.getByText("Execution Controls", { exact: true })).toBeVisible();
  await expect(dialog.getByTestId("task-details-timeline")).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Comments" })).toBeVisible();

  await dialog.getByPlaceholder("Add a comment...").fill("E2E depth comment");
  await dialog.getByRole("button", { name: "Add comment" }).click();
  await expect.poll(() => writeAttempts >= 1, { timeout: 15_000 }).toBe(true);

  await dialog.getByTestId("task-details-complete").click();
  await expect.poll(() => writeAttempts >= 2, { timeout: 15_000 }).toBe(true);

  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-details-dialog-depth.png" });
  await page.keyboard.press("Escape");
});

test("task details execution controls hidden when editTasks is denied", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await installDepthTask(page);
  await blockTaskCommentWrites(page);
  await denyKeys(page, [EDIT_TASKS_KEY]);
  await signIn(page);

  await page.goto("/app/tasks");
  await page.getByTestId("tasks-mode-all").click();
  const card = page.getByTestId(`task-card-${DETAIL_TASK_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  const dialog = page.getByTestId("task-details-dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByTestId("task-details-actions")).toBeVisible();
  await expect(dialog.getByText("Execution Controls", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/tasks-details-no-execution.png",
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

async function installDepthTask(page: Page, onTaskWrite?: () => void) {
  await page.unroute("**/rest/v1/tasks*").catch(() => undefined);
  await page.route("**/rest/v1/tasks*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      onTaskWrite?.();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const hasFixture = rows.some(
      (row) =>
        row &&
        typeof row === "object" &&
        (row as { id?: string }).id === DETAIL_TASK_ID,
    );
    if (!hasFixture) {
      const now = new Date().toISOString();
      rows.unshift({
        id: DETAIL_TASK_ID,
        title: DETAIL_TASK_TITLE,
        description: "QA depth fixture",
        status: "todo",
        priority: "medium",
        assigned_to: null,
        created_by: "00000000-0000-4000-8000-000000000001",
        goal_id: null,
        due_date: null,
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
      });
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}

async function blockTaskCommentWrites(page: Page, onWrite?: () => void) {
  const patterns = [
    "**/rest/v1/task_comments*",
    "**/rest/v1/task_activity*",
    "**/rest/v1/task_activities*",
  ];
  for (const pattern of patterns) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        await route.continue();
        return;
      }
      onWrite?.();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          method === "DELETE"
            ? null
            : method === "POST"
              ? { id: "e2e-blocked-comment" }
              : {},
        ),
      });
    });
  }
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