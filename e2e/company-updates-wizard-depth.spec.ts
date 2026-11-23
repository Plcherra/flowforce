import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
    window.localStorage.removeItem("company-update:draft");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      return Array.isArray(json) ? json.map(pin) : pin(json);
    });
  });
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("create update wizard walks all five steps with publish blocked", async ({ page }) => {
  test.setTimeout(180_000);
  let publishAttempted = false;
  await signIn(page);
  await blockUpdateWrites(page);
  await page.route("**/rest/v1/company_updates*", async (route) => {
    if (route.request().method() === "GET") {
      await route.continue();
      return;
    }
    publishAttempted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "00000000-0000-4000-8000-0000000000aa" }),
    });
  });

  await page.goto("/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("company-updates-new").click();
  await expect(page.getByRole("heading", { name: "Create company update" })).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    page.getByRole("heading", { name: "Start from Scratch" }),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /Next step/i }).click();
  await expect(page.locator("#title")).toBeVisible({ timeout: 20_000 });
  await page.locator("#title").fill("QA loop wizard title");
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await editor.click();
  await editor.pressSequentially("QA loop wizard body for e2e.");

  await page.getByRole("button", { name: /Next step/i }).click();
  await expect(
    page.getByRole("heading", { name: /Select recipients/i }),
  ).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: /Next step/i }).click();
  await expect(page.getByRole("tab", { name: "Publish" }).or(page.getByText(/Publish now/i))).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: /Next step/i }).click();
  await expect(page.getByRole("button", { name: /Publish update/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/company-updates-wizard-summary.png" });

  await page.getByRole("button", { name: /Publish update/i }).click();
  await expect.poll(() => publishAttempted, { timeout: 15_000 }).toBe(true);
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fcompany-updates");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockUpdateWrites(page: Page) {
  for (const pattern of [
    "**/rest/v1/company_update_reactions*",
    "**/rest/v1/company_update_comments*",
    "**/storage/v1/object/**",
  ]) {
    await page.route(pattern, async (route) => {
      if (route.request().method() === "GET" || route.request().method() === "HEAD") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  }
}