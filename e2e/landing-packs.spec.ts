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
  await expect(page.getByTestId("landing-pack-price-ops")).toHaveText("$59/mo");
  await expect(page.getByTestId("landing-pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("landing-pack-price-insights")).toHaveText("$19/mo");
  await expect(page.getByTestId("landing-pack-price-stock")).toHaveText("$29/mo");
  await expect(model).toContainText(
    "Billed monthly per company. Team, Insights, and Stock are add-ons on Ops.",
  );

  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Price TBD");
  expect(body).not.toContain("awaiting pricing");
  expect(body.toLowerCase()).not.toContain("still being decided");
  expect(body.toLowerCase()).not.toContain("multi-location");
  expect(body.toLowerCase()).not.toContain("multi-business");
  expect(body.toLowerCase()).not.toContain("custom form builder");
  expect(body.toLowerCase()).not.toContain("custom builder");

  await page.goto("/pricing");
  const pricing = page.getByTestId("pricing-pack-note");
  await expect(pricing).toBeVisible();
  await expect(page.getByTestId("pricing-pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("pricing-pack-price-insights")).toHaveText("$19/mo");
  await expect(page.getByTestId("pricing-pack-price-stock")).toHaveText("$29/mo");
  await expect(pricing).toContainText("Add-ons sit on top of Ops");
  await expect(pricing).not.toContainText("Pricing coming soon");
});
