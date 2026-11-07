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
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByLabel("Email").fill("ada.owner@example.com");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-company")).toBeVisible();
  await page.getByLabel("Company name").fill("North Cafe");
  await page.locator("#business-type").selectOption("restaurant");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await expect(page.getByTestId("account-role-cashier")).toBeChecked();
  await expect(page.getByTestId("account-role-cook")).toBeChecked();
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-permissions")).toBeVisible();
  await expect(page.getByText("Department default").first()).toBeVisible();
  await expect(page.getByText("Overrides the department")).toHaveCount(0);
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-store")).toBeVisible();
  await page.getByLabel("Store name").fill("Rua");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-invite")).toBeVisible();
  await page.getByTestId("account-skip").click();

  await expect(page.getByTestId("account-step-starter")).toBeVisible();
  await expect(page.getByTestId("account-starter-lists")).toBeVisible();
  await expect(page.getByTestId("account-finish")).toBeVisible();
  expect(writes).toEqual([]);
});
