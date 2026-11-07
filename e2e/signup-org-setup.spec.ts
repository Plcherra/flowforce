import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("coffee shop template is the signup default and stays editable", async ({ page }) => {
  await page.goto("/company-registration");
  await expect(page.getByTestId("org-setup")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("org-start-template")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("org-business-restaurant")).toHaveCount(0);
  await expect(page.getByTestId("org-role-cashier")).toHaveValue("Cashier");
  await expect(page.getByTestId("org-role-barista")).toHaveValue("Barista");
  await expect(page.getByTestId("org-role-lead")).toHaveValue("Shift lead");
  await expect(page.getByTestId("org-role-baker")).toHaveValue("Baker/Prep");
  await expect(page.getByTestId("org-role-manager")).toHaveValue("Manager");

  await page.getByTestId("org-role-barista").fill("Espresso");
  await page.getByTestId("org-remove-role-cashier").click();
  await expect(page.getByTestId("org-role-cashier")).toHaveCount(0);
  await expect(page.getByTestId("org-role-barista")).toHaveValue("Espresso");

  await page.getByTestId("org-setup").screenshot({
    path: "/opt/cursor/artifacts/signup-departments-roles.png",
  });

  await page.getByTestId("signup-next").click();
  await expect(page.getByTestId("org-permissions")).toBeVisible();
  await expect(page.getByTestId("role-lead-schedule.edit")).toBeChecked();
  await expect(page.getByTestId("role-barista-schedule.edit")).not.toBeChecked();
  await expect(page.getByTestId("role-baker-forms.submit")).toBeChecked();
  await expect(page.getByTestId("role-baker-schedule.edit")).not.toBeChecked();
  await expect(page.getByTestId("role-manager-schedule.edit")).toBeChecked();
  await page.getByTestId("org-permissions").screenshot({
    path: "/opt/cursor/artifacts/signup-permissions.png",
  });
});

test("signup can start from an empty coffee shop team", async ({ page }) => {
  await page.goto("/company-registration");
  await expect(page.getByTestId("org-setup")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("org-start-scratch").click();
  await expect(page.getByTestId("org-start-scratch")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("org-empty-departments")).toBeVisible();
  await expect(page.getByTestId("org-role-cashier")).toHaveCount(0);
  await expect(page.getByTestId("signup-next")).toBeDisabled();
  await page.getByTestId("org-empty-departments").screenshot({
    path: "/opt/cursor/artifacts/signup-scratch-empty.png",
  });

  await page.getByTestId("org-add-department").click();
  await expect(page.getByTestId("org-empty-roles")).toBeVisible();
  await expect(page.getByTestId("signup-next")).toBeDisabled();
  await page.getByTestId("org-add-role").click();
  await page.getByLabel("Department").fill("Bar");
  await page.getByLabel("Role").fill("Closer");
  await expect(page.getByTestId("signup-next")).toBeEnabled();

  await page.getByTestId("signup-next").click();
  await expect(page.getByTestId("org-permissions")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closer" })).toBeVisible();
  await expect(page.locator("[data-testid$='-schedule.view']").first()).not.toBeChecked();

  await page.getByTestId("signup-steps").getByRole("button", { name: "Departments and roles" }).click();
  await page.getByTestId("org-start-template").click();
  await expect(page.getByTestId("org-role-cashier")).toHaveValue("Cashier");
  await expect(page.getByTestId("org-role-manager")).toHaveValue("Manager");
});
