import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const CREATE_KEYS = [
  "tasks.custom.create_self",
  "tasks.custom.create_others",
  "editTasks",
] as const;

const LIST_ISSUE_KEYS = ["tasks.list_issues.read", "tasks.list_issues.act"] as const;

const LIST_ISSUE_TASK_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";

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

test("tasks page, create menu, and custom create keys", async ({ page }) => {
  test.setTimeout(180_000);
  await installTaskRoute(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  await expect(page.getByTestId("tasks-board-switch")).toBeVisible();
  await expect(page.getByTestId("tasks-mode-shift")).toBeVisible();
  await expect(page.getByTestId("tasks-mode-all")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-my-shift-before.png" });

  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-search-input")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("tasks-priority-filter")).toBeVisible();
  await expect(page.getByTestId("tasks-status-all")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-all-view-before.png" });

  await expect(page.getByTestId("tasks-create-button")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("tasks-create-button").click();
  await expect(page.getByTestId("tasks-create-menu")).toBeVisible();
  await page
    .getByTestId("tasks-create-menu")
    .getByRole("button", { name: "New custom task" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create New Task" })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-create-dialog.png" });
  await page.keyboard.press("Escape");

  await denyCreateKeys(page);
  await page.reload();
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-create-button")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-no-create.png" });

  await allowOnly(page, ["tasks.custom.create_self"]);
  await page.reload();
  await expect(page.getByTestId("tasks-create-button")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("tasks-create-button").click();
  await page
    .getByTestId("tasks-create-menu")
    .getByRole("button", { name: "New custom task" })
    .click();
  await expect(dialog.getByText("Assigned to you")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-create-self-only.png" });
  await page.keyboard.press("Escape");

  await pinStaffRole(page);
  await allowListIssueRead(page);
  await installTaskRoute(page, { injectListIssue: true });
  await page.reload();
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("list-issue-gather")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-issue-visible.png" });

  await denyListIssueKeys(page);
  await page.reload();
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("list-issue-gather")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-issue-hidden.png" });
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

async function installTaskRoute(
  page: Page,
  options: { injectListIssue?: boolean } = {},
) {
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
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    if (options.injectListIssue) {
      const hasListIssue = rows.some(
        (row) =>
          row &&
          typeof row === "object" &&
          (row as { links?: { list_issue_kind?: string } }).links
            ?.list_issue_kind != null,
      );
      if (!hasListIssue) {
        const now = new Date().toISOString();
        rows.unshift({
          id: LIST_ISSUE_TASK_ID,
          title: "e2e missed opening list",
          description: null,
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
          links: { list_issue_kind: "missed_form" },
          parent_task_id: null,
          origin_event_id: null,
          tags: null,
          source: "form",
          company_id: null,
          updated_at: now,
        });
      }
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}

async function pinStaffRole(page: Page) {
  await page.unroute("**/rest/v1/profiles*").catch(() => undefined);
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const demote = (row: unknown) => {
      if (!row || typeof row !== "object") return row;
      return {
        ...(row as Record<string, unknown>),
        role: "staff",
        language: "en",
      };
    };
    const body = Array.isArray(json) ? json.map(demote) : demote(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function denyCreateKeys(page: Page) {
  await patchPermissions(page, CREATE_KEYS, "deny");
}

async function denyListIssueKeys(page: Page) {
  await patchPermissions(page, LIST_ISSUE_KEYS, "deny");
}

async function allowListIssueRead(page: Page) {
  await patchPermissions(page, LIST_ISSUE_KEYS, (key) =>
    key === "tasks.list_issues.read" ? "allow" : "deny",
  );
}

async function allowOnly(page: Page, allow: string[]) {
  await patchPermissions(page, CREATE_KEYS, (key) =>
    allow.includes(key) ? "allow" : "deny",
  );
}

async function patchPermissions(
  page: Page,
  keys: readonly string[],
  value: "deny" | "allow" | ((key: string) => "deny" | "allow"),
) {
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
      permission_value: typeof value === "function" ? value(key) : value,
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}
