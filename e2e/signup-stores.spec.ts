import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

async function reachStoreStep(page: import("@playwright/test").Page) {
  await page.goto("/company-registration");
  await expect(page.getByTestId("account-step-signup")).toBeVisible();
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByLabel("Email").fill("ada.owner@example.com");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-company")).toBeVisible();
  await page.getByLabel("Company name").fill("North Cafe");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-permissions")).toBeVisible();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-store")).toBeVisible();
}

test("signup store step requires a store and skips the invite store when there is one", async ({
  page,
}) => {
  await reachStoreStep(page);
  await expect(page.getByTestId("account-next")).toBeEnabled();
  await page.getByLabel("Store name").fill("");
  await page.getByTestId("account-next").click();
  await expect(page.getByText("Add the store name and hours.")).toBeVisible();

  await page.getByLabel("Store name").fill("Rua");
  await page.getByLabel("Address").fill("12 High Street");
  await page.screenshot({
    path: "/opt/cursor/artifacts/signup-store-step.png",
    fullPage: true,
  });
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-invite")).toBeVisible();
  await page.getByTestId("account-invite-open").click();
  await expect(page.getByTestId("invite-dialog")).toBeVisible();
  await expect(page.getByTestId("invite-location")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/signup-invite-single-store.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
});

test("invite modal asks for a store when the company has two", async ({ page }) => {
  await reachStoreStep(page);
  await page.getByLabel("Store name").fill("Rua");
  await page.getByLabel("Address").fill("12 High Street");
  await page.getByTestId("store-add").click();
  await page.getByTestId("store-name-1").fill("Mall");
  await page.getByTestId("store-address-1").fill("4 Market Lane");
  await page.getByTestId("account-next").click();

  await expect(page.getByTestId("account-step-invite")).toBeVisible();
  await page.getByTestId("account-invite-open").click();
  const dialog = page.getByTestId("invite-dialog");
  await expect(dialog).toBeVisible();
  const location = dialog.getByTestId("invite-location");
  await expect(location).toBeVisible();
  await location.selectOption({ label: "Mall" });
  await expect(location).toHaveValue(/.+/);
  await dialog.getByLabel("Email").fill("mall.lead@example.com");
  await page.screenshot({
    path: "/opt/cursor/artifacts/signup-invite-modal.png",
    fullPage: true,
  });
  await dialog.getByTestId("invite-send").click();
  await expect(page.getByText("mall.lead@example.com")).toBeVisible();
});
