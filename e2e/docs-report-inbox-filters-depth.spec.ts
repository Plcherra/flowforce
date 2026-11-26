import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const READY_DOC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc63";
const ERROR_DOC_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd87";
const READY_TITLE = "E2E Report Inbox Alpha";
const ERROR_TITLE = "E2E Report Inbox Error";

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

test("status filter chips narrow inbox rows without writes", async ({ page }) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockDocumentWrites(page);
  await installInboxDocuments(page);
  await signIn(page);

  await page.goto("/app/reports");
  await expect(page.getByTestId("reports-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("reports-status-filters")).toBeVisible();
  await expect(page.getByTestId(`reports-inbox-row-${READY_DOC_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId(`reports-inbox-row-${ERROR_DOC_ID}`)).toBeVisible();

  await page.getByTestId("reports-status-filter-error").click();
  await expect(page.getByTestId(`reports-inbox-row-${ERROR_DOC_ID}`)).toBeVisible();
  await expect(page.getByTestId(`reports-inbox-row-${READY_DOC_ID}`)).toHaveCount(0);
  await expect(page.getByText(ERROR_TITLE, { exact: true })).toBeVisible();

  await page.getByTestId("reports-status-filter-ready").click();
  await expect(page.getByTestId(`reports-inbox-row-${READY_DOC_ID}`)).toBeVisible();
  await expect(page.getByTestId(`reports-inbox-row-${ERROR_DOC_ID}`)).toHaveCount(0);

  await page.getByTestId("reports-status-filter-all").click();
  await expect(page.getByTestId(`reports-inbox-row-${READY_DOC_ID}`)).toBeVisible();
  await expect(page.getByTestId(`reports-inbox-row-${ERROR_DOC_ID}`)).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-report-inbox-filters-depth.png" });
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

async function installInboxDocuments(page: Page) {
  await page.unroute("**/rest/v1/documents*").catch(() => undefined);
  await page.route("**/rest/v1/documents*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({ status: 200, body: "[]" });
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const stamp = new Date().toISOString();
    const fixtures = [
      {
        id: READY_DOC_ID,
        title: READY_TITLE,
        source: "e2e-fixture",
        processing_state: "ready",
        company_id: "00000000-0000-4000-8000-000000000099",
        created_at: stamp,
        updated_at: stamp,
        events: [],
      },
      {
        id: ERROR_DOC_ID,
        title: ERROR_TITLE,
        source: "e2e-fixture",
        processing_state: "error",
        company_id: "00000000-0000-4000-8000-000000000099",
        created_at: stamp,
        updated_at: stamp,
        events: [],
      },
    ];
    for (const fixture of fixtures) {
      if (
        !rows.some(
          (row) => row && typeof row === "object" && (row as { id?: string }).id === fixture.id,
        )
      ) {
        rows.unshift(fixture);
      }
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}

async function blockDocumentWrites(page: Page) {
  for (const pattern of ["**/rest/v1/documents*", "**/storage/v1/object/**"]) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
  }
}