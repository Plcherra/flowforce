import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const REPORT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REPORT_TITLE = "E2E Spotlight Report";

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

test("reports analyzer row click spotlights assistant context", async ({ page }) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockAnalyticsWrites(page);
  await injectInboxReport(page);
  await signIn(page);

  await page.goto("/app/analytics");
  await expect(page.getByTestId("analytics-page")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("tab", { name: "Reports Analyzer" }).click();
  const row = page.getByTestId("reports-analyzer-row").filter({
    hasText: REPORT_TITLE,
  });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  await expect(row).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Co-Pilot Live" }).click();
  await expect(
    page.locator(".fixed.right-6").getByText(REPORT_TITLE, { exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await row.click();
  await expect(row).toHaveAttribute("data-selected", "false");
  await page.screenshot({
    path: "/opt/cursor/artifacts/analytics-reports-analyzer-row.png",
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

async function injectInboxReport(page: Page) {
  await page.route("**/rest/v1/documents*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? [...json] : [];
      const stamp = "2026-11-22T12:00:00.000Z";
      const extra = {
        id: REPORT_ID,
        title: REPORT_TITLE,
        source: "upload",
        processing_state: "ready",
        company_id:
          rows[0] && typeof rows[0] === "object"
            ? (rows[0] as { company_id?: string }).company_id
            : null,
        created_at: stamp,
        updated_at: stamp,
        originating_tasks: [{ id: "task-1" }],
        file: { filename: REPORT_TITLE },
      };
      const exists = rows.some(
        (row) => row && typeof row === "object" && (row as { id?: string }).id === REPORT_ID,
      );
      return exists ? rows : [extra, ...rows];
    });
  });
}