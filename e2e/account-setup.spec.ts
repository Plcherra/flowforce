import { expect, test } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("walks signup through starter lists and does not create a company", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/onboarding/complete")) {
      writes.push(request.method());
    }
  });

  await page.goto("/company-registration");
  await expect(page.getByTestId("account-step-signup")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding-signup.png", fullPage: true });
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByLabel("Email").fill("ada.owner@example.com");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-company")).toBeVisible();
  await page.getByLabel("Company name").fill("North Cafe");
  await expect(page.locator("#business-type")).toHaveCount(0);
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await expect(page.getByTestId("org-source-template")).toBeChecked();
  await expect(page.getByTestId("org-role-cashier")).toHaveValue("Cashier");
  await expect(page.getByTestId("org-role-cook")).toHaveValue("Cook");
  await page.getByTestId("org-source-scratch").check();
  await expect(page.getByTestId("org-role-cashier")).toHaveCount(0);
  await page.getByTestId("org-source-template").check();
  await page.screenshot({
    path: "/opt/cursor/artifacts/onboarding-departments.png",
    fullPage: true,
  });
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-permissions")).toBeVisible();
  await expect(page.getByTestId("org-permissions")).toBeVisible();
  await expect(page.getByTestId("role-lead-schedule.edit")).toBeChecked();
  await page.screenshot({
    path: "/opt/cursor/artifacts/onboarding-permissions.png",
    fullPage: true,
  });
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-store")).toBeVisible();
  await page.getByLabel("Store name").fill("Rua");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-invite")).toBeVisible();
  await page.getByTestId("account-skip").click();

  await expect(page.getByTestId("account-step-starter")).toBeVisible();
  await expect(page.getByTestId("account-starter-lists")).toBeChecked();
  await expect(page.getByTestId("starter-source-template")).toBeChecked();
  await expect(page.getByLabel("List name").first()).toHaveValue("Opening list");
  await page.getByTestId("starter-source-scratch").check();
  await expect(page.getByLabel("List name")).toHaveValue("");
  await expect(page.getByTestId("account-finish")).toBeVisible();
  expect(writes).toEqual([]);
});
