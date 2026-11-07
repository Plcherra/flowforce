import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("company signup starts with departments, roles, and permissions", async ({ page }) => {
  await page.goto("/company-registration");
  await expect(page.getByTestId("org-setup")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("org-role-cashier")).toHaveValue("Cashier");
  await expect(page.getByTestId("org-role-cook")).toHaveValue("Cook");
  await page.getByTestId("org-setup").screenshot({
    path: "/opt/cursor/artifacts/signup-departments-roles.png",
  });

  await page.getByTestId("org-business-restaurant").click();
  await expect(page.getByTestId("org-role-server")).toHaveValue("Server");

  await page.getByTestId("signup-next").click();
  await expect(page.getByTestId("org-permissions")).toBeVisible();
  await expect(page.getByTestId("role-lead-schedule.edit")).toHaveCount(0);
  await page.getByTestId("org-permissions").screenshot({
    path: "/opt/cursor/artifacts/signup-permissions.png",
  });
});
