import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      return Array.isArray(json) ? json.map(pin) : pin(json);
    });
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("personal language cancel restores saved value without profile writes", async ({ page }) => {
  test.setTimeout(120_000);
  let writeAttempted = false;
  let trackWrites = false;
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    if (method === "GET" && url.includes("select=language")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ language: "en" }),
      });
      return;
    }
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    if (trackWrites) {
      writeAttempted = true;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ language: "fr" }),
    });
  });

  await signIn(page);
  await page.goto("/app/settings?tab=localization");
  await expect(page.getByTestId("personal-language-setting")).toBeVisible({
    timeout: 30_000,
  });
  trackWrites = true;
  await expect(page.getByTestId("personal-language")).toContainText("English");
  await page.getByTestId("personal-language").click();
  await page.getByRole("option", { name: "Deutsch" }).click();
  await expect(page.getByTestId("personal-language-save")).toBeVisible();
  await expect(page.getByTestId("personal-language-cancel")).toBeVisible();
  await page.getByTestId("personal-language-cancel").click();
  await expect(page.getByTestId("personal-language-save")).toHaveCount(0);
  await expect(page.getByTestId("personal-language")).toContainText("English");
  await expect.poll(() => writeAttempted).toBe(false);
  await page.screenshot({ path: "/opt/cursor/artifacts/settings-localization-cancel.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings%3Ftab%3Dlocalization");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}