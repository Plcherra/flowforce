import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("activation shows the job role and checks the password twice", async ({ page }) => {
  await page.route("**/api/employees/invite/preview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "lightningtplm@gmail.com",
        first_name: "Lightning",
        last_name: "Barista",
        role: "staff",
        role_name: "Barista",
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth?invite=preview-token");
  await expect(page.getByTestId("invite-job-role")).toContainText("Barista");
  await expect(page.getByTestId("invite-access-level")).toContainText("Staff");
  await expect(page.getByTestId("invite-job-role")).not.toContainText("staff");

  const password = page.getByTestId("invite-password");
  await password.fill("Harbor!Meal9");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByTestId("invite-password-toggle").click();
  await expect(password).toHaveAttribute("type", "text");

  await page.getByTestId("invite-confirm-password").fill("different");
  await expect(page.getByTestId("invite-password-mismatch")).toBeVisible();
  await expect(page.getByTestId("invite-activate")).toBeDisabled();
  await page.getByTestId("invite-confirm-password").fill("Harbor!Meal9");
  await expect(page.getByTestId("invite-activate")).toBeEnabled();

  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    await page.screenshot({
      path: "/opt/cursor/artifacts/activate-mobile.png",
      fullPage: true,
    });
  } catch {
    // Screenshot storage is only present in the agent workspace.
  }
});

test("a required hiring file keeps the hire from finishing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const preview = await page.goto("/onboarding-preview?screen=hire");
  test.skip(preview?.status() === 404, "The onboarding preview route is disabled in production.");
  await expect(page.getByTestId("hiring-checklist")).toBeVisible();
  await expect(page.getByTestId("hiring-progress")).toContainText("0 of 2 done");
  await expect(page.getByTestId("hiring-check-share_card")).toContainText("Welcome to the shop");
  await expect(page.getByTestId("onboarding-welcome")).toHaveCount(0);
  await expect(page.getByTestId("onboarding-finish")).toBeDisabled();
  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    await page.screenshot({
      path: "/opt/cursor/artifacts/hire-required-mobile.png",
      fullPage: true,
    });
  } catch {
    // Screenshot storage is only present in the agent workspace.
  }
});
