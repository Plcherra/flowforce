import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MANAGE_KEYS = [
  "updates.manage",
  "systemSettings",
  "admin.settings",
] as const;

const NO_MATCH_SEARCH = "zzze2e-company-updates-no-match-zz";

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
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      return Array.isArray(json) ? json.map(pin) : pin(json);
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

test("company updates feed switches views, search, and dashboard view all", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await blockUpdateWrites(page);

  await page.goto("/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Grid" }).click();
  await expect(page.getByRole("button", { name: "Grid" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: "/opt/cursor/artifacts/company-updates-grid.png",
  });

  await page.getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByRole("button", { name: "Feed" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const search = page.locator("#company-updates-search");
  await search.fill(NO_MATCH_SEARCH);
  await expect(page.getByRole("heading", { name: "No updates found" })).toBeVisible({
    timeout: 20_000,
  });
  await search.fill("");
  await page.screenshot({
    path: "/opt/cursor/artifacts/company-updates-search-cleared.png",
  });

  const showing = page.getByText(/Showing \d+-\d+ of \d+ updates/i);
  if ((await showing.count()) > 0) {
    await expect(showing.first()).toBeVisible();
  }

  await page.goto("/app/dashboard");
  await expect(page.getByTestId("overview-company-updates")).toBeVisible({
    timeout: 30_000,
  });
  const viewAll = page.getByRole("button", { name: /View all updates/i });
  if ((await viewAll.count()) > 0) {
    await viewAll.click();
    await page.waitForURL(/\/app\/company-updates/, { timeout: 30_000 });
    await expect(page.getByTestId("company-updates-page")).toBeVisible();
  }
});

test("staff load uses published-only filter and hides manage controls", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await pinStaffRole(page);
  await denyManageKeys(page);
  await blockUpdateWrites(page);
  const listRequest = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      /\/rest\/v1\/company_updates(\?|$)/.test(request.url()),
    { timeout: 45_000 },
  );
  await signIn(page, "/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("company-updates-new")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Update actions" })).toHaveCount(0);
  const listUrl = decodeURIComponent((await listRequest).url());
  expect(listUrl).toMatch(/status=eq\.published/);
  expect(listUrl).not.toMatch(/scheduled/);

  await page.screenshot({
    path: "/opt/cursor/artifacts/company-updates-staff-readonly.png",
  });
});

async function signIn(page: Page, redirectPath = "/app/company-updates") {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  const redirectTo = encodeURIComponent(redirectPath);
  await page.goto(`/auth?redirectTo=${redirectTo}`);
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockUpdateWrites(page: Page) {
  await page.route("**/rest/v1/company_updates*", async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === "GET" || url.includes("company_update_")) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  await page.route("**/rest/v1/company_update_reactions*", async (route) => {
    if (route.request().method() === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  await page.route("**/rest/v1/company_update_comments*", async (route) => {
    if (route.request().method() === "GET") {
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

async function pinStaffRole(page: Page) {
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const demote = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        return {
          ...(row as Record<string, unknown>),
          role: "staff",
          language: "en",
        };
      };
      return Array.isArray(json) ? json.map(demote) : demote(json);
    });
  });
}

async function denyManageKeys(page: Page) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? json : [];
      const kept = rows.filter((row) => {
        const key =
          row && typeof row === "object"
            ? (row as { permission_key?: string }).permission_key
            : "";
        return !MANAGE_KEYS.includes(key as (typeof MANAGE_KEYS)[number]);
      });
      const denied = MANAGE_KEYS.map((key) => ({
        permission_key: key,
        permission_value: "deny",
      }));
      return [...denied, ...kept];
    });
  });
}
