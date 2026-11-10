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

test("help desk URL opens messages", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/help-desk");
  await expect(page).toHaveURL(/\/app\/messages/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/help-desk-messages-redirect.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fmessages");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
