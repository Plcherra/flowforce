import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const POLICY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const POLICY_NAME = "E2E vacation cap";
const APPROVE_KEY = "approveTimeOff" as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
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
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("company policies panel lists mocked row and blocks policy writes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let policyWrite = false;
  await allowKeys(page, [APPROVE_KEY]);
  await signIn(page);
  await blockPolicyWrites(page, () => {
    policyWrite = true;
  });

  await page.goto("/app/enhanced-scheduling?panel=company-policies");
  await expect(page.getByTestId("scheduling-panel-sheet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Company policies", exact: true }),
  ).toBeVisible();

  await expect(page.getByTestId("company-policies")).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByTestId("company-policy-name").filter({ hasText: POLICY_NAME })).toBeVisible();
  await expect(page.getByTestId("company-policy-month-cap")).toBeVisible();

  await page.getByTestId("company-policies-create").click();
  await expect(page.locator("#policy-name")).toBeVisible({ timeout: 15_000 });
  await page.locator("#policy-name").fill("E2E draft policy");
  await page.getByRole("button", { name: "Save policy" }).click();
  await expect.poll(() => policyWrite, { timeout: 15_000 }).toBe(true);

  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-company-policies-depth.png",
  });
});

test("company policies panel limited without approveTimeOff", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await blockPolicyWrites(page);
  await denyKeys(page, [APPROVE_KEY]);

  await page.goto("/app/enhanced-scheduling?panel=company-policies");
  await expect(page.getByTestId("scheduling-panel-sheet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Company policies are limited")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("company-policies")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/schedule-company-policies-denied.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto(
    "/auth?redirectTo=%2Fapp%2Fenhanced-scheduling%3Fpanel%3Dcompany-policies",
  );
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

const MOCK_POLICY_ROW = {
  id: POLICY_ID,
  company_id: "00000000-0000-4000-8000-000000000001",
  name: POLICY_NAME,
  type: "time_off",
  unit: "days",
  cap_week: null,
  cap_month: 10,
  cap_year: null,
  eligible_weekdays: [1, 2, 3, 4, 5],
  notice_days: 7,
  archived_at: null,
};

async function injectPolicies(page: Page, onWrite?: () => void) {
  await page.route("**/rest/v1/company_policies*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await fulfillGetWithJson(route, (json) => {
        const rows = Array.isArray(json) ? [...json] : [];
        const hasMock = rows.some(
          (row) =>
            row &&
            typeof row === "object" &&
            (row as { id?: string }).id === POLICY_ID,
        );
        if (hasMock) return rows;
        return [...rows, MOCK_POLICY_ROW];
      });
      return;
    }
    onWrite?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(method === "DELETE" ? null : [{ id: POLICY_ID }]),
    });
  });

  await page.route("**/rest/v1/company_policy_assignments*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await fulfillGetWithJson(route, () => []);
      return;
    }
    onWrite?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

async function blockPolicyWrites(page: Page, onWrite?: () => void) {
  await injectPolicies(page, onWrite);
}

async function allowKeys(page: Page, keys: readonly string[]) {
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
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: "allow",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...rows]),
    });
  });
}

async function denyKeys(page: Page, keys: readonly string[]) {
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
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}