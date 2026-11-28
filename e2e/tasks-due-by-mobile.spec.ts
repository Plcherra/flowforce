import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

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

test("phone screenshot: due-by create controls", async ({ page }) => {
  await signIn(page);

  await page.getByTestId("tasks-create-button").click();
  await page.getByTestId("tasks-create-menu").getByRole("button").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#title").fill(`phone-due-ui-${Date.now()}`);
  const assigneeLabel = dialog.locator('label[for="assigned_to"]');
  if ((await assigneeLabel.count()) > 0) {
    await assigneeLabel.locator("..").getByRole("combobox").click();
    await page.getByRole("option").first().click();
  }
  await page.getByTestId("create-task-due-by-toggle").click();
  await page.getByTestId("create-task-due-by-date").fill("2026-12-15");
  await page.getByTestId("create-task-due-by-time").fill("09:00");
  await expect(page.getByTestId("create-task-due-by-section")).toBeVisible();
  if (!process.env.CI) {
    await page.screenshot({
      path: "/opt/cursor/artifacts/tasks-due-by-phone-create.png",
      fullPage: true,
    });
  }
  await page.keyboard.press("Escape");
});

test("phone: all-tasks board shows list or empty state", async ({ page }) => {
  await signIn(page);
  await page.getByTestId("tasks-mode-all").click();
  const board = page
    .getByTestId("tasks-list")
    .or(page.getByTestId("tasks-empty-state"))
    .or(page.getByTestId("tasks-no-results"));
  await expect(board).toBeVisible({ timeout: 20_000 });
  if (!process.env.CI) {
    await page.screenshot({
      path: "/opt/cursor/artifacts/tasks-due-by-phone-list.png",
      fullPage: true,
    });
  }
});

async function signIn(page: Page) {
  await page.goto("/auth?redirectTo=%2Fapp%2Ftasks");
  await page.getByLabel("Email").fill(process.env.TEST_USER_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible();
}