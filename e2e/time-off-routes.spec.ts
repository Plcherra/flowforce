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

test("legacy time off paths redirect to scheduling panel", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);

  for (const path of ["/app/time-off", "/app/scheduling/timeoff"] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(/panel=timeoff/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "My time off", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  }

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-route-aliases.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Ftime-off");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}