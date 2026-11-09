import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const GOAL_KEYS = ["goals.view", "goals.manage"] as const;
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

test("legacy goals route redirects to tasks", async ({ page }) => {
  test.setTimeout(120_000);
  await blockGoalWrites(page);
  await signIn(page);
  await page.goto("/app/goals");
  await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 30_000 });
  await expect(page.getByTestId("tasks-page")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/goals-redirect-tasks.png" });
});

test("performance goal progress follows goals.view", async ({ page }) => {
  test.setTimeout(180_000);
  await pinTeamPack(page);
  await blockGoalWrites(page);
  await signIn(page);

  await page.goto("/app/performance");
  await expect(
    page.getByRole("heading", { name: "Performance & Reviews" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("performance-goal-progress")).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/goals-performance-visible.png" });

  await denyKeys(page, GOAL_KEYS);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Performance & Reviews" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("performance-goal-progress")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/goals-performance-hidden.png" });
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

async function blockGoalWrites(page: Page) {
  await page.route("**/rest/v1/goals*", async (route) => {
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
