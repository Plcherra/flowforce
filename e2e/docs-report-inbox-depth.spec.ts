import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const FIXTURE_DOC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc63";
const FIXTURE_TITLE = "E2E Report Inbox Alpha";

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

test("report inbox search filters mocked rows and review opens sheet", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockDocumentWrites(page);
  await installInboxDocuments(page);
  await signIn(page);

  await page.goto("/app/reports");
  await expect(page.getByTestId("reports-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(FIXTURE_TITLE, { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  const search = page.getByPlaceholder("Search by title, source, or filename");
  await search.fill("zzzz-no-report-inbox-match");
  await expect(page.getByText(FIXTURE_TITLE, { exact: true })).toHaveCount(0);
  await expect(page.getByText("No reports yet", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await search.fill("E2E Report");
  await expect(page.getByText(FIXTURE_TITLE, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Review", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: FIXTURE_TITLE, exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-report-inbox-depth.png" });
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
    if (!rows.some((row) => row && typeof row === "object" && (row as { id?: string }).id === FIXTURE_DOC_ID)) {
      const now = new Date().toISOString();
      rows.unshift({
        id: FIXTURE_DOC_ID,
        title: FIXTURE_TITLE,
        source: "e2e-fixture",
        processing_state: "ready",
        company_id: "00000000-0000-4000-8000-000000000099",
        created_at: now,
        updated_at: now,
        events: [],
      });
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