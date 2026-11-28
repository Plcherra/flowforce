import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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

test("all tasks phone layout: compact rows, sort control, no horizontal scroll", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("tasks-view-section")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("tasks-sort-filter")).toBeVisible();
  await expect(page.getByTestId("tasks-all-sticky")).toBeVisible();

  const list = page.getByTestId("tasks-list");
  const empty = page.getByTestId("tasks-empty-state");
  await expect(list.or(empty)).toBeVisible({ timeout: 30_000 });

  if (await list.isVisible()) {
    await expect(list).toHaveAttribute("data-mobile-layout", "compact");
    await expect(page.locator("[data-testid^='task-mobile-row-']").first()).toBeVisible();
  }

  const overflows = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflows).toBe(false);

  await page.screenshot({
    path: "/opt/cursor/artifacts/tasks-phone-all-tasks-after.png",
    fullPage: true,
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