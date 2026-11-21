import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

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

test("all-tasks filters, detail dialog, and below-list panels", async ({ page }) => {
  test.setTimeout(180_000);
  await blockTaskWrites(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("tasks-mode-shift")).toBeVisible();
  const myShift = page.getByTestId("my-shift-tasks");
  const myShiftEmpty = page.getByTestId("my-shift-empty");
  await expect(myShift.or(myShiftEmpty).or(page.getByTestId("my-shift-unmapped"))).toBeVisible({
    timeout: 30_000,
  });

  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-view-section")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("tasks-search-input")).toBeVisible();
  await expect(page.getByTestId("tasks-kind-filter")).toBeVisible();
  await expect(page.getByTestId("tasks-priority-filter")).toBeVisible();
  await expect(page.getByTestId("tasks-status-all")).toBeVisible();

  const list = page.getByTestId("tasks-list");
  const empty = page.getByTestId("tasks-empty-state");
  await expect(list.or(empty)).toBeVisible({ timeout: 30_000 });

  if (await list.isVisible()) {
    const firstCard = page.locator("[data-testid^='task-card-']").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page.getByTestId("task-details-dialog")).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("task-details-dialog")).toHaveCount(0);
  }

  await page.getByTestId("tasks-search-input").fill("zzzz-no-task-match-e2e-qa");
  await expect(page.getByTestId("tasks-no-results")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-no-results.png" });

  await page.getByTestId("tasks-search-input").fill("");
  await expect(page.getByTestId("tasks-status-todo")).toBeVisible();
  await page.getByTestId("tasks-status-todo").click();
  await expect(page.getByTestId("tasks-view-section")).toBeVisible();

  await page.getByTestId("tasks-kind-filter").click();
  await page.getByRole("option", { name: "Custom", exact: true }).click();
  await expect(page.getByTestId("tasks-kind-filter")).toContainText(/custom/i);

  await expect(page.getByTestId("tasks-below-list")).toBeVisible();
  await expect(page.getByTestId("reminders-panel")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-below-panels.png" });
});

test("task notifications popover opens without task writes", async ({ page }) => {
  test.setTimeout(120_000);
  await blockTaskWrites(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  const trigger = page.getByTestId("task-notifications-trigger");
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await expect(
    page.getByTestId("task-notifications-list").or(page.getByText("No notifications yet")),
  ).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-notifications-popover.png" });
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
    "**/rest/v1/task_activity*",
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