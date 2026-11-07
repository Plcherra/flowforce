import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("landing presents Operations plus add-on packs", async ({ page }) => {
  await page.goto("/");
  const model = page.getByTestId("landing-pack-model");
  await expect(model).toBeVisible();
  await expect(model).toContainText("OPS is the base");
  await expect(page.getByTestId("landing-pack-ops")).toContainText("Included");
  await expect(page.getByTestId("landing-pack-team")).toContainText("Team");
  await expect(page.getByTestId("landing-pack-insights")).toContainText("Insights");
  await expect(page.getByTestId("landing-pack-stock")).toContainText("Stock");

  const body = await page.locator("body").innerText();
  expect(body.toLowerCase()).not.toContain("multi-location");
  expect(body.toLowerCase()).not.toContain("multi-business");
  expect(body.toLowerCase()).not.toContain("custom form builder");
  expect(body.toLowerCase()).not.toContain("custom builder");
});
