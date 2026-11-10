import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("sign-in page, forgot-password request, and reset form", async ({
  page,
}) => {
  await page.route("**/auth/v1/recover**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/auth-sign-in.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset Password" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.com");
  await page.getByRole("button", { name: "Send Reset Link" }).click();
  await expect(
    page.getByText("Check your email", { exact: true }).first(),
  ).toBeVisible({ timeout: 15_000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/auth-forgot-password.png",
    fullPage: true,
  });

  await page.goto("/auth?reset=true");
  await expect(
    page.getByRole("heading", { name: "Set New Password" }),
  ).toBeVisible();
  await page.getByLabel("New Password", { exact: true }).fill("new-pass-6");
  await page.getByLabel("Confirm New Password", { exact: true }).fill("new-pass-6");
  await page.screenshot({
    path: "/opt/cursor/artifacts/auth-reset-form.png",
    fullPage: true,
  });
  await blockAuthUserUpdate(page);
  await page.getByRole("button", { name: "Update Password" }).click();
});

test("sign-in respects redirectTo with the test user", async ({ page }) => {
  test.setTimeout(120_000);
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    test.skip(true, `Missing env: ${missing.join(", ")}`);
  }
  await page.goto("/auth?redirectTo=%2Fapp%2Fprofile");
  await page.getByLabel("Email", { exact: true }).fill(
    process.env.TEST_USER_EMAIL ?? "",
  );
  await page.getByLabel("Password", { exact: true }).fill(
    process.env.TEST_USER_PASSWORD ?? "",
  );
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\/profile/, { timeout: 45_000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/auth-sign-in-redirect.png",
    fullPage: true,
  });
});

async function blockAuthUserUpdate(page: Page) {
  await page.route("**/auth/v1/user**", async (route) => {
    const method = route.request().method();
    if (method === "PUT" || method === "PATCH") {
      await route.fulfill({ status: 200, body: "{}" });
      return;
    }
    await route.continue();
  });
}
