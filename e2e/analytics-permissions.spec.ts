import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const REPORT_KEYS = ["reports.view", "reports.export"] as const;
const AI_INSIGHTS_KEY = "viewAIInsights" as const;
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

test("report inbox follows reports.view and reports.export", async ({ page }) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockAnalyticsWrites(page);
  await signIn(page);

  await page.goto("/app/reports");
  await expect(page.getByTestId("reports-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("reports-export-button")).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/analytics-reports-visible.png",
  });

  await denyKeys(page, [REPORT_KEYS[0]]);
  await page.reload();
  await expect(page.getByTestId("reports-access-restricted")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/analytics-reports-restricted.png",
  });

  await allowKeys(page, [REPORT_KEYS[0]]);
  await denyKeys(page, [REPORT_KEYS[1]]);
  await page.reload();
  await expect(page.getByTestId("reports-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("reports-export-button")).toHaveCount(0);
});

test("ai insights panel follows viewAIInsights", async ({ page }) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockAnalyticsWrites(page);
  await signIn(page);

  await page.goto("/app/ai-insights");
  await expect(
    page.getByRole("heading", { name: "AI Insights", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await denyKeys(page, [AI_INSIGHTS_KEY]);
  await page.reload();
  await expect(page.getByTestId("ai-insights-restricted")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/analytics-ai-insights-restricted.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Freports");
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

async function denyKeys(page: Page, keys: readonly string[]) {
  await patchPermissions(page, keys, "deny");
}

async function allowKeys(page: Page, keys: readonly string[]) {
  await patchPermissions(page, keys, "allow");
}

async function patchPermissions(
  page: Page,
  keys: readonly string[],
  value: "deny" | "allow",
) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !keys.includes(key as (typeof keys)[number]);
    });
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: value,
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}
