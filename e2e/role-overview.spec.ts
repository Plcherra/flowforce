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

test("shows a role overview and hides the builder widgets", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("role-overview")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("overview-my-shift")).toBeVisible();
  await expect(page.getByTestId("overview-my-lists")).toBeVisible();
  await expect(page.getByTestId("overview-company-updates")).toBeVisible();
  await expect(page.getByText("Manager action queue")).toHaveCount(0);
  await expect(page.getByText("Operations Snapshot")).toHaveCount(0);

  const leadership = await page.getByTestId("role-overview").getAttribute("data-leadership");
  if (leadership === "true") {
    await expect(page.getByTestId("overview-coverage")).toBeVisible();
    await expect(page.getByTestId("overview-list-status")).toBeVisible();
  } else {
    await expect(page.getByTestId("overview-coverage")).toHaveCount(0);
  }

  const logo = page.getByTestId("header-company-logo");
  if ((await logo.count()) > 0) {
    await expect(logo).toBeVisible();
  } else {
    await expect(page.getByTestId("header-wordmark")).toBeVisible();
  }

  await expect(page.getByTestId("bottom-nav").getByRole("button", { name: "Add new" })).toHaveCount(0);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-standard-theme")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("radiogroup")).toHaveCount(0);

  await page.goto("/app/add-section");
  await expect(page).not.toHaveURL(/add-section/);
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
