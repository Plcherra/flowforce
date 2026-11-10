import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";

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

test("owner billing tab shows Ops and pack prices and mocks checkout without writes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const writes = trackWrites(page);
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await mockOffers(page, { team: true, insights: false, stock: false });
  await page.route("https://checkout.stripe.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Stripe test checkout</title>",
    });
  });
  await page.route("**/api/packs/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://checkout.stripe.com/c/pay/cs_test_mock",
        sessionId: "cs_test_mock",
      }),
    });
  });
  await signIn(page);

  await page.goto("/app/settings?tab=billing");
  await expect(page.getByTestId("billing-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("billing-plan-ops")).toBeVisible();
  await expect(page.getByTestId("billing-ops-price")).toHaveText("$59/mo");
  await expect(page.getByTestId("billing-pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("billing-pack-price-insights")).toHaveText("$19/mo");
  await expect(page.getByTestId("billing-pack-price-stock")).toHaveText("$29/mo");
  await expect(page.getByTestId("billing-monthly-total")).toContainText("$59/mo");

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com\/c\/pay\/cs_test_mock/, { timeout: 20_000 }),
    page.getByTestId("billing-add-team").click(),
  ]);
  expect(writes.filter((entry) => entry.includes("system_settings"))).toEqual([]);
  expect(writes.filter((entry) => entry.includes("api.stripe.com"))).toEqual([]);

  await page.screenshot({
    path: "/opt/cursor/artifacts/packs-billing-settings.png",
    fullPage: true,
  });
});

test("staff profile does not see the billing settings tab", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-standard-theme")).toBeVisible({
    timeout: 30_000,
  });
  await pinStaffProfile(page);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Billing" })).toHaveCount(0);
  await expect(page.getByTestId("billing-page")).toHaveCount(0);
});

function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("api.stripe.com")) writes.push(request.method() + " " + url);
    if (
      request.method() !== "GET" &&
      request.method() !== "HEAD" &&
      request.method() !== "OPTIONS" &&
      url.includes("/rest/v1/system_settings")
    ) {
      writes.push(request.method() + " " + url);
    }
  });
  return writes;
}

async function mockOffers(
  page: Page,
  offers: { team: boolean; insights: boolean; stock: boolean },
) {
  await page.route("**/api/packs/offers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ offers }),
    });
  });
}

async function pinPackFlags(
  page: Page,
  flags: { team: boolean; insights: boolean; stock: boolean },
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: PACK_FLAG_OVERRIDE_STORAGE_KEY, value: flags },
  );
}

async function pinStaffProfile(page: Page) {
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
        role: "staff",
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
