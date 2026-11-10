import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("availability and schedule lobby alias routes land on scheduling", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/availability");
  await expect(page).toHaveURL(/panel=availability/, { timeout: 30_000 });
  await page.goto("/app/availability/manage");
  await expect(page).toHaveURL(/panel=availability/, { timeout: 30_000 });
  await page.goto("/app/schedule-lobby");
  await expect(page).toHaveURL(/\/app\/enhanced-scheduling/, {
    timeout: 30_000,
  });
  await page.goto("/schedule-lobby");
  await expect(page).toHaveURL(/\/app\/enhanced-scheduling/, {
    timeout: 30_000,
  });
});

test("custom sections and invite employee aliases redirect", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/add-section");
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 30_000 });
  await page.goto("/app/section/demo-section");
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 30_000 });
  await page.goto("/app/invite-employee");
  await expect(page).toHaveURL(/\/app\/employees/, { timeout: 30_000 });
  await expect(page).toHaveURL(/invite=1/, { timeout: 30_000 });
});

test("public onboarding entry points resolve without writes", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/company-registration/, { timeout: 30_000 });
  await page.goto("/onboarding-preview");
  await expect(page.locator("body")).toBeVisible();
  await page.goto("/forms-preview");
  await expect(page.locator("body")).toBeVisible();
});

test("legacy inventory alias pages load for signed-in owner", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  for (const path of ["/app/purchasing", "/app/cookbook"] as const) {
    const response = await page.goto(path);
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    await expect(page.getByTestId("account-cluster")).toBeVisible({
      timeout: 30_000,
    });
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).not.toContain("application error");
  }
  await page.screenshot({
    path: "/opt/cursor/artifacts/legacy-inventory-aliases.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
