import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test("marketing routes render in English without pack smoke overlap", async ({
  page,
}) => {
  await page.goto("/features");
  await expect(
    page.getByRole("heading", { name: "Powerful Features for Modern Teams" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Shift Scheduling", level: 3 }),
  ).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/marketing-features.png",
    fullPage: true,
  });

  await page.goto("/hr-development");
  await expect(
    page.getByRole("heading", {
      name: "Unified XP, Recognition, and Growth",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/marketing-hr-development.png",
    fullPage: true,
  });

  await page.goto("/templates");
  await expect(
    page.getByRole("heading", { name: "Industry Templates" }),
  ).toBeVisible({ timeout: 20_000 });

  await page.goto("/register");
  await expect(
    page.getByText("Register Your Company", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/marketing-register.png",
    fullPage: true,
  });
});
