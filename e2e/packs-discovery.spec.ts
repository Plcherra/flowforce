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
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("opens packs from the OPS plus button and shows pricing coming soon", async ({
  page,
}) => {
  const writes = trackWrites(page);
  const checkoutHits: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/packs/checkout")
    ) {
      checkoutHits.push(request.url());
    }
  });
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await mockOffers(page, { team: false, insights: false, stock: false });
  await signIn(page);

  await expect(page.getByTestId("packs-discovery-banner")).toHaveCount(0);
  await expect(page.getByTestId("nav-packs-add")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("nav-packs-add")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByTestId("nav-packs-add").click();
  const sheet = page.getByTestId("packs-add-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("pack-add-team")).toContainText("certifications");
  await expect(sheet.getByTestId("pack-add-insights")).toContainText(
    "Operations Intelligence",
  );
  await expect(sheet.getByTestId("pack-add-stock")).toContainText(
    "Inventory and expenses",
  );

  await expect(sheet.getByTestId("pack-add-price-team")).toHaveText("$19/mo");
  await expect(sheet.getByTestId("pack-add-price-insights")).toHaveText("$19/mo");
  await expect(sheet.getByTestId("pack-add-price-stock")).toHaveText("$29/mo");
  await expect(page.getByTestId("packs-add-price-note")).toHaveText(
    "Billed monthly per company. Add-ons sit on top of Ops.",
  );

  await sheet.getByTestId("pack-add-team").click();
  await page.waitForURL(/\/app\/packs\/team/, { timeout: 20_000 });
  await expect(page.getByTestId("pack-detail")).toHaveAttribute("data-pack", "team");
  await expect(page.getByTestId("pack-card-team")).toContainText("leaderboard");
  await expect(page.getByTestId("pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("pack-price-note-team")).toHaveText(
    "Billed monthly per company. Add-ons sit on top of Ops.",
  );
  await expect(page.getByTestId("pack-pricing-soon-team")).toHaveText(
    "Pricing coming soon",
  );
  await expect(page.getByTestId("pack-buy-team")).toHaveCount(0);

  await page.goto("/app/packs");
  await expect(page.getByTestId("pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("pack-price-insights")).toHaveText("$19/mo");
  await expect(page.getByTestId("pack-price-stock")).toHaveText("$29/mo");
  await expect(page.getByTestId("pack-buy-team")).toHaveCount(0);
  await expect(page.getByTestId("pack-buy-insights")).toHaveCount(0);
  await expect(page.getByTestId("pack-buy-stock")).toHaveCount(0);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Price TBD");
  expect(body).not.toContain("awaiting pricing");
  expect(writes).toEqual([]);
  expect(checkoutHits).toEqual([]);
});

test("mocked Stripe test checkout and customer portal do not write settings", async ({
  page,
}) => {
  const writes = trackWrites(page);
  await pinPackFlags(page, { team: false, insights: true, stock: false });
  await mockOffers(page, { team: true, insights: false, stock: false });
  await page.route("https://checkout.stripe.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Stripe test checkout</title><p>Stripe test checkout</p>",
    });
  });
  await page.route("https://billing.stripe.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Stripe test portal</title><p>Stripe customer portal</p>",
    });
  });

  let checkoutBody: { pack?: string } | null = null;
  await page.route("**/api/packs/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON() as { pack?: string };
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
  await page.goto("/app/packs/team");
  await expect(page.getByTestId("pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("pack-pricing-soon-team")).toHaveCount(0);
  await expect(page.getByTestId("pack-buy-team")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pack-buy-team")).toHaveAttribute(
    "data-permission",
    "billing.manage",
  );
  await page.getByTestId("pack-buy-team").click();
  await expect(page.getByText("Stripe test checkout")).toBeVisible();
  expect(checkoutBody).toEqual({ pack: "team" });

  let portalBody: { pack?: string } | null = null;
  await page.route("**/api/packs/portal", async (route) => {
    portalBody = route.request().postDataJSON() as { pack?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://billing.stripe.com/p/session/test_mock",
      }),
    });
  });

  await page.goto("/app/packs/insights");
  await expect(page.getByTestId("pack-pricing-soon-insights")).toHaveCount(0);
  await expect(page.getByTestId("pack-manage-insights")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("pack-manage-insights").click();
  await expect(page.getByText("Stripe customer portal")).toBeVisible();
  expect(portalBody).toEqual({ pack: "insights" });
  expect(writes.filter((entry) => entry.includes("api.stripe.com"))).toEqual([]);
  expect(writes.filter((entry) => entry.includes("system_settings"))).toEqual([]);
});

test("hides pack purchase when billing management is denied", async ({ page }) => {
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await mockOffers(page, { team: true, insights: true, stock: true });
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "00000000-0000-4000-8000-000000000008",
          user_id: "00000000-0000-4000-8000-000000000001",
          permission_key: "billing.manage",
          permission_value: "deny",
          created_at: "2026-11-06T00:00:00.000Z",
          updated_at: "2026-11-06T00:00:00.000Z",
        },
      ]),
    });
  });

  await signIn(page);
  await page.goto("/app/packs/team");
  const detail = page.getByTestId("pack-detail");
  await expect(detail).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("packs-purchase-denied")).toBeVisible();
  await expect(page.getByTestId("pack-buy-team")).toHaveCount(0);
  await expect(page.getByTestId("pack-price-team")).toHaveText("$19/mo");
  await expect(page.getByTestId("pack-price-note-team")).toContainText("Add-ons sit on top of Ops");
});

test("turns a pack on after a mocked checkout confirmation and does not charge", async ({
  page,
}) => {
  const writes = trackWrites(page);
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await mockOffers(page, { team: false, insights: false, stock: false });
  let confirmBody: { pack?: string; sessionId?: string } | null = null;
  await page.route("**/api/packs/confirm", async (route) => {
    confirmBody = route.request().postDataJSON() as {
      pack?: string;
      sessionId?: string;
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        pack: "team",
        flags: { ops: true, team: true, insights: false, stock: false },
      }),
    });
  });

  await signIn(page);
  await page.goto("/app/packs/team?checkout=success&session_id=cs_test_mock");
  await expect(page.getByTestId("pack-card-team")).toHaveAttribute(
    "data-enabled",
    "true",
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("packs-checkout-notice")).toHaveAttribute(
    "data-notice",
    "confirmed",
  );
  expect(confirmBody).toEqual({ pack: "team", sessionId: "cs_test_mock" });
  expect(writes.filter((entry) => entry.includes("system_settings"))).toEqual([]);
  expect(writes.filter((entry) => entry.includes("api.stripe.com"))).toEqual([]);
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

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";

  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await page.goto("/app/dashboard");
}
