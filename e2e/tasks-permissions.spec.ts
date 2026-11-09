import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const CREATE_KEYS = [
  "tasks.custom.create_self",
  "tasks.custom.create_others",
  "editTasks",
] as const;

const LIST_ISSUE_KEYS = ["tasks.list_issues.read", "tasks.list_issues.act"] as const;

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
  await signIn(page);
  await blockTaskWrites(page);

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

  await denyListIssueKeys(page);
  await page.reload();
  await expect(page.getByTestId("list-issue-gather")).toHaveCount(0);
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
  await page.route("**/rest/v1/tasks*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

async function denyCreateKeys(page: Page) {
  await patchPermissions(page, CREATE_KEYS, "deny");
}

async function denyListIssueKeys(page: Page) {
  await patchPermissions(page, LIST_ISSUE_KEYS, "deny");
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
      permission_value:
        typeof value === "function" ? value(key) : value,
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}
