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

test("shows pack cards, placeholder prices, and stops checkout before a charge", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("stripe.com")) writes.push(request.method() + " " + url);
    if (
      request.method() !== "GET" &&
      request.method() !== "HEAD" &&
      request.method() !== "OPTIONS" &&
      url.includes("/rest/v1/system_settings")
    ) {
      writes.push(request.method() + " " + url);
    }
  });

  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await signIn(page);

  await expect(page.getByTestId("packs-discovery-banner")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("account-cluster").click();
  await page.getByTestId("account-packs-link").click();
  await page.waitForURL(/\/app\/packs/, { timeout: 20_000 });
  await expectPackCards(page);
  await expect(page.getByTestId("packs-page")).toHaveAttribute(
    "data-can-purchase",
    "true",
  );
  await expect(page.getByTestId("pack-buy-team")).toHaveAttribute(
    "data-permission",
    "billing.manage",
  );

  await page.goto("/app/settings?tab=packs");
  await expect(page.getByRole("tab", { name: "Packs" })).toBeVisible({
    timeout: 20_000,
  });
  await expectPackCards(page);
  await page.getByRole("tab", { name: "Billing" }).click();
  await expect(page.getByTestId("billing-packs-link")).toBeVisible();
  await page.getByRole("tab", { name: "Packs" }).click();
  await expect(page.getByTestId("pack-buy-insights")).toBeVisible();

  let checkoutBody: { pack?: string } | null = null;
  await page.route("**/api/packs/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON() as { pack?: string };
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        code: "pack_price_pending",
        message: "pending",
      }),
    });
  });

  await page.getByTestId("pack-buy-insights").click();
  await expect(page.getByTestId("packs-checkout-notice")).toHaveAttribute(
    "data-notice",
    "price_pending",
  );
  await expect(page.getByTestId("packs-checkout-notice")).toHaveText(
    "Checkout is waiting for a price. Nothing was charged.",
  );
  expect(checkoutBody).toEqual({ pack: "insights" });
  await expect(page.getByTestId("pack-card-insights")).toHaveAttribute(
    "data-enabled",
    "false",
  );
  expect(writes).toEqual([]);
});

test("hides pack purchase when billing management is denied", async ({ page }) => {
  await pinPackFlags(page, { team: false, insights: false, stock: false });
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
  await page.goto("/app/packs");
  const packs = page.getByTestId("packs-page");
  await expect(packs).toBeVisible({ timeout: 20_000 });
  await expect(packs).toHaveAttribute("data-can-purchase", "false");
  await expect(page.getByTestId("packs-purchase-denied")).toBeVisible();
  await expect(page.getByTestId("pack-buy-team")).toHaveCount(0);
  await expect(page.getByTestId("pack-buy-insights")).toHaveCount(0);
  await expect(page.getByTestId("pack-buy-stock")).toHaveCount(0);
  await expect(page.getByTestId("pack-price-team")).toHaveText("Price TBD");
});

test("turns a pack on after a mocked checkout confirmation and does not charge", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("stripe.com")) writes.push(url);
    if (
      request.method() !== "GET" &&
      request.method() !== "HEAD" &&
      request.method() !== "OPTIONS" &&
      url.includes("/rest/v1/system_settings")
    ) {
      writes.push(request.method() + " " + url);
    }
  });

  await pinPackFlags(page, { team: false, insights: false, stock: false });
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
  await page.goto("/app/packs?checkout=success&pack=team&session_id=cs_test_mock");
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
  await expect(page.getByTestId("pack-card-insights")).toHaveAttribute(
    "data-enabled",
    "false",
  );
  expect(writes).toEqual([]);
});

async function expectPackCards(page: Page) {
  await expect(page.getByTestId("packs-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("packs-ops-note")).toContainText(
    "starts on Operations",
  );

  await expect(page.getByTestId("pack-card-team")).toContainText("Team");
  await expect(page.getByTestId("pack-card-team")).toContainText("certifications");
  await expect(page.getByTestId("pack-card-team")).toContainText("leaderboard");
  await expect(page.getByTestId("pack-card-insights")).toContainText(
    "Operations Intelligence",
  );
  await expect(page.getByTestId("pack-card-stock")).toContainText("Inventory and expenses");

  for (const pack of ["team", "insights", "stock"] as const) {
    await expect(page.getByTestId(`pack-card-${pack}`)).toHaveAttribute(
      "data-enabled",
      "false",
    );
    await expect(page.getByTestId(`pack-status-${pack}`)).toHaveText("Off");
    await expect(page.getByTestId(`pack-price-${pack}`)).toHaveText("Price TBD");
    await expect(page.getByTestId(`pack-price-note-${pack}`)).toHaveText(
      "Placeholder — awaiting pricing",
    );
  }
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
