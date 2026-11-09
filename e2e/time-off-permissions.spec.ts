import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const REQUEST_KEY = "timeoff.request" as const;
const APPROVE_KEY = "approveTimeOff" as const;

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

test("my time off request button follows timeoff.request", async ({ page }) => {
  test.setTimeout(180_000);
  await blockTimeOffWrites(page);
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=timeoff");
  await expect(
    page.getByRole("heading", { name: "My time off", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("time-off-request-btn")).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-request-visible.png",
  });

  await denyKeys(page, [REQUEST_KEY]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My time off", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("time-off-request-btn")).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-request-hidden.png",
  });
});

test("team time off approvals follow approveTimeOff", async ({ page }) => {
  test.setTimeout(180_000);
  await blockTimeOffWrites(page);
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=staff");
  await expect(page.getByTestId("team-requests")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: "Time Off" }).click();
  const hadApproveActions =
    (await page.getByTestId("time-off-approve-actions").count()) > 0;
  if (hadApproveActions) {
    await page.screenshot({
      path: "/opt/cursor/artifacts/time-off-approve-visible.png",
    });
  }

  await denyKeys(page, [APPROVE_KEY]);
  await page.reload();
  await page.getByRole("tab", { name: "Time Off" }).click();
  await expect(page.getByTestId("time-off-approve-actions")).toHaveCount(0);
  await expect(page.getByTestId("time-off-request-btn")).toBeVisible({
    timeout: 20_000,
  });
  if (hadApproveActions) {
    await page.screenshot({
      path: "/opt/cursor/artifacts/time-off-approve-hidden.png",
    });
  }
});

test("time off team list filters by company_id", async ({ page }) => {
  test.setTimeout(180_000);
  await blockTimeOffWrites(page);
  await signIn(page);
  await page.goto("/app/enhanced-scheduling?panel=staff");
  await expect(page.getByTestId("team-requests")).toBeVisible({
    timeout: 30_000,
  });
  const teamListRequest = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      request.url().includes("time_off_requests") &&
      request.url().includes("company_id=eq."),
    { timeout: 45_000 },
  );
  await page.getByRole("tab", { name: "Time Off" }).click();
  const url = decodeURIComponent((await teamListRequest).url());
  expect(url).toMatch(/company_id=eq\./);
  expect(url).toMatch(/user:profiles/);
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fenhanced-scheduling%3Fpanel%3Dtimeoff");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockTimeOffWrites(page: Page) {
  await page.route("**/rest/v1/time_off_requests*", async (route) => {
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
