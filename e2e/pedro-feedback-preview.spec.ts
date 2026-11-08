import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("invite, hiring flow, and schedule permissions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/onboarding-preview?screen=invite");
  await expect(page.getByTestId("invite-role")).toBeVisible();
  await expect(page.getByTestId("invite-department")).toBeVisible();
  await expect(page.getByTestId("invite-location")).toBeVisible();
  await expect(page.getByTestId("access-customize")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/invite-step.png",
    fullPage: true,
  });

  await page.getByTestId("access-customize").click();
  await expect(page.getByTestId("access-group-schedule")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/invite-permissions.png",
    fullPage: true,
  });

  await page.goto("/onboarding-preview?screen=hiring");
  await expect(page.getByTestId("hiring-builder")).toBeVisible();
  await expect(page.getByTestId("hiring-block-collect_file")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/hiring-builder.png",
    fullPage: true,
  });

  await page.goto("/onboarding-preview?screen=permissions");
  await expect(page.getByTestId("preview-manager-permissions")).toBeVisible();
  await expect(page.getByTestId("access-group-schedule").first()).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/role-schedule-permissions.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding-preview?screen=permissions");
  await expect(page.getByTestId("access-summary").first()).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/permissions-mobile.png",
    fullPage: true,
  });
});

test("owner store step is required and priced packs are locked", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const packs = page.getByTestId("landing-pack-model");
  await packs.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("landing-pack-price-ops")).toHaveText("$59/mo");
  await expect(page.getByTestId("landing-pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("landing-pack-price-stock")).toHaveText("$29/mo");
  await packs.screenshot({
    path: "/opt/cursor/artifacts/landing-prices.png",
  });

  await page.goto("/company-registration");
  await page.getByLabel("First name").fill("Avery");
  await page.getByLabel("Last name").fill("Cole");
  await page.getByLabel("Email", { exact: true }).fill("avery.cole.preview@flowforce.uk");
  await page.getByLabel("Password").fill("Harbor!Meal9");
  await page.getByTestId("account-next").click();
  await page.getByLabel("Company name").fill("Harbor Coffee");
  await page.getByTestId("account-next").click();
  await page.getByTestId("account-next").click();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-store")).toBeVisible();
  await expect(page.getByTestId("account-skip")).toHaveCount(0);
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-store")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/owner-store-step.png",
    fullPage: true,
  });
});
