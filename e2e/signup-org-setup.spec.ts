import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

async function reachDepartments(page: Page) {
  await page.goto("/company-registration");
  await expect(page.getByTestId("account-step-signup")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByLabel("Email").fill("ada.owner@example.com");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-company")).toBeVisible();
  await page.getByLabel("Company name").fill("North Cafe");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await expect(page.getByTestId("org-setup")).toBeVisible();
}

test("coffee shop template is the signup default and stays editable", async ({ page }) => {
  await reachDepartments(page);
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

  await page.getByTestId("account-next").click();
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
  await reachDepartments(page);
  await page.getByTestId("org-start-scratch").click();
  await expect(page.getByTestId("org-start-scratch")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("org-empty-departments")).toBeVisible();
  await expect(page.getByTestId("org-role-cashier")).toHaveCount(0);
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await expect(page.getByText("Turn on at least one role.")).toBeVisible();
  await page.getByTestId("org-empty-departments").screenshot({
    path: "/opt/cursor/artifacts/signup-scratch-empty.png",
  });

  await page.getByTestId("org-add-department").click();
  await expect(page.getByTestId("org-empty-roles")).toBeVisible();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await page.getByTestId("org-add-role").click();
  await page.getByLabel("Department").fill("Bar");
  await page.getByLabel("Role").fill("Closer");

  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("org-permissions")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closer" })).toBeVisible();
  await expect(page.locator("[data-testid$='-schedule.view']").first()).not.toBeChecked();

  await page.getByTestId("account-back").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await page.getByTestId("org-start-template").click();
  await expect(page.getByTestId("org-role-cashier")).toHaveValue("Cashier");
  await expect(page.getByTestId("org-role-manager")).toHaveValue("Manager");
});
