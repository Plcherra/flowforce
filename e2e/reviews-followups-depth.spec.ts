import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const REVIEW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let signedInUserId = "";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await pinTeamPack(page);
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      const body = Array.isArray(json) ? json.map(pin) : pin(json);
      if (Array.isArray(body)) {
        const row = body.find(
          (item) => item && typeof item === "object" && "id" in item,
        ) as { id?: string } | undefined;
        if (row?.id) signedInUserId = row.id;
      } else if (body && typeof body === "object" && "id" in body) {
        signedInUserId = String((body as { id: string }).id);
      }
      return body;
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

test("performance recent reviews list and refresh with mocked review row", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockReviewWrites(page);
  await signIn(page);
  await injectRecentReview(page);

  await page.goto("/app/performance");
  await expect(
    page.getByRole("heading", { name: "Performance & Reviews" }),
  ).toBeVisible({ timeout: 30_000 });

  const section = page.getByTestId("performance-reviews-section");
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(section.getByText("Recent reviews")).toBeVisible();
  await expect(section.getByText("E2E review follow-up")).toBeVisible();
  await expect(section.getByText("N/A")).toBeVisible();

  await page.getByTestId("performance-refresh").click();
  await expect(section).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/reviews-followups-depth.png",
  });
});

test("review rest query still omits goal_id after dataset load", async ({ page }) => {
  test.setTimeout(180_000);
  await blockReviewWrites(page);
  const reviewRequest = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      request.url().includes("performance_reviews"),
    { timeout: 45_000 },
  );
  await signIn(page);
  await injectRecentReview(page);
  await page.goto("/app/performance");
  await expect(page.getByTestId("performance-reviews-section")).toBeVisible({
    timeout: 30_000,
  });
  const request = await reviewRequest;
  expect(request.url()).not.toMatch(/goal_id/);
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fperformance");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinTeamPack(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: PACK_FLAG_OVERRIDE_STORAGE_KEY,
      value: { team: true, insights: false, stock: false },
    },
  );
}

async function blockReviewWrites(page: Page) {
  await page.route("**/rest/v1/performance_reviews*", async (route) => {
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

async function injectRecentReview(page: Page) {
  await page.route("**/rest/v1/performance_reviews*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const companyId =
      rows[0] && typeof rows[0] === "object"
        ? ((rows[0] as { company_id?: string }).company_id ?? null)
        : null;
    const employeeId = signedInUserId || null;
    if (!employeeId) {
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
      return;
    }
    const createdAt = new Date().toISOString();
    const injected = {
      id: REVIEW_ID,
      company_id: companyId,
      employee_id: employeeId,
      reviewerid: employeeId,
      created_at: createdAt,
      updated_at: createdAt,
      review_cycle: "quarterly",
      summary: "E2E review follow-up",
      score: null,
    };
    const merged = [...rows.filter((row) => (row as { id?: string }).id !== REVIEW_ID), injected];
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(merged),
    });
  });
}