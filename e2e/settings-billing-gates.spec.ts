import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || !request.url().includes("language")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const pin = (row: unknown) =>
      row && typeof row === "object"
        ? { ...(row as Record<string, unknown>), language: "en" }
        : row;
    const body = Array.isArray(json) ? json.map(pin) : pin(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
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

test("manager profile never sees billing tab even with billing.manage allowed", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await pinManagerProfile(page);
  await allowBillingManage(page);
  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-standard-theme")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "Billing" })).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/settings-billing-manager-hidden.png" });
});

test("owner manage billing mocks portal session without Stripe network", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const apiWrites: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("api.stripe.com")) {
      apiWrites.push(request.method() + " " + url);
    }
  });

  await page.route("**/api/stripe/create-portal-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://billing.stripe.com/p/session/test_mock_portal",
      }),
    });
  });
  await page.route("https://billing.stripe.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Stripe billing portal (mock)</title>",
    });
  });

  await signIn(page);
  await page.goto("/app/settings?tab=billing");
  await expect(page.getByTestId("billing-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("billing-manage")).toBeVisible();

  await Promise.all([
    page.waitForURL(/billing\.stripe\.com\/p\/session\/test_mock_portal/, {
      timeout: 20_000,
    }),
    page.getByTestId("billing-manage").click(),
  ]);
  expect(apiWrites).toEqual([]);
  await page.screenshot({ path: "/opt/cursor/artifacts/settings-billing-portal-mock.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinManagerProfile(page: Page) {
  await page.unroute("**/rest/v1/profiles*");
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const demote = (row: unknown) => {
      if (!row || typeof row !== "object") return row;
      return {
        ...(row as Record<string, unknown>),
        role: "manager",
        language: "en",
      };
    };
    const body = Array.isArray(json) ? json.map(demote) : demote(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function allowBillingManage(page: Page) {
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const hasBilling = rows.some(
      (row) =>
        row &&
        typeof row === "object" &&
        (row as { permission_key?: string }).permission_key === "billing.manage",
    );
    if (!hasBilling) {
      rows.unshift({
        permission_key: "billing.manage",
        permission_value: "allow",
      });
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}