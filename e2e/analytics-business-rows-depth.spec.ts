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

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("business tab renders metric, breakdown, and prediction rows", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockAnalyticsWrites(page);
  await signIn(page);

  await page.goto("/app/analytics");
  await expect(page.getByTestId("analytics-page")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("analytics-tab-business").click();
  await expect(page.getByTestId("analytics-panel-business")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("analytics-business-board")).toBeVisible({
    timeout: 30_000,
  });

  await expect(page.getByTestId("analytics-business-metrics")).toBeVisible();
  await expect(page.getByTestId("analytics-business-metric-goal-velocity")).toBeVisible();
  await expect(page.getByTestId("analytics-business-metric-labor-efficiency")).toBeVisible();
  await expect(page.getByTestId("analytics-business-metric-forecast-confidence")).toBeVisible();

  await expect(page.getByTestId("analytics-business-breakdown")).toBeVisible();
  for (const row of [
    "scheduling",
    "tasks",
    "goals",
    "revenue",
  ] as const) {
    await expect(
      page.getByTestId(`analytics-business-breakdown-${row}`),
    ).toBeVisible();
  }

  await expect(page.getByTestId("analytics-business-predictions")).toBeVisible();
  await expect(page.getByTestId("analytics-business-prediction-0")).toBeVisible({
    timeout: 20_000,
  });

  await page.screenshot({
    path: "/opt/cursor/artifacts/analytics-business-rows-depth.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fanalytics");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinInsightsPack(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: PACK_FLAG_OVERRIDE_STORAGE_KEY,
      value: { team: false, insights: true, stock: false },
    },
  );
}

async function blockAnalyticsWrites(page: Page) {
  for (const pattern of [
    "**/rest/v1/documents*",
    "**/storage/v1/object/**",
    "**/rest/v1/performance_*",
  ]) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD") {
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