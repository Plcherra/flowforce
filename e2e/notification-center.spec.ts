import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

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

test("header notification inbox differs from profile notification prefs", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/dashboard");
  await page.getByTestId("account-cluster").click();
  await expect(page.getByText("Notifications", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("No notifications yet")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/header-notification-inbox.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");

  await page.goto("/app/settings?tab=notifications");
  await expect(page.getByTestId("notification-settings-panel")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/profile-notification-prefs.png",
    fullPage: true,
  });
});

test("tasks module exposes task notification bell", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/tasks");
  const trigger = page.getByTestId("task-notifications-trigger");
  await expect(trigger).toBeVisible({ timeout: 30_000 });
  await trigger.click();
  await expect(page.getByText("No notifications yet")).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/task-notification-center.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
