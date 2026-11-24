import { expect, test, type Page, type Route } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const GOAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PARTICIPANT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let signedInUserId = "";
let signedInCompanyId: string | null = null;

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
      const captureProfile = (row: unknown) => {
        if (!row || typeof row !== "object") return;
        const record = row as { id?: string; company_id?: string | null };
        if (record.id) signedInUserId = record.id;
        if (record.company_id) signedInCompanyId = record.company_id;
      };
      if (Array.isArray(body)) {
        body.forEach(captureProfile);
      } else {
        captureProfile(body);
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
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("performance refresh reloads mocked goal progress row", async ({ page }) => {
  test.setTimeout(180_000);
  await blockGoalWrites(page);
  await signIn(page);
  await injectMockGoal(page);

  await page.goto("/app/performance");
  await expect(
    page.getByRole("heading", { name: "Performance & Reviews" }),
  ).toBeVisible({ timeout: 30_000 });

  const goalSection = page.getByTestId("performance-goal-progress");
  await expect(goalSection).toBeVisible({ timeout: 30_000 });
  await expect(goalSection.getByText("E2E mocked goal refresh")).toBeVisible();
  await expect(page.getByTestId(`performance-goal-row-${GOAL_ID}`)).toBeVisible();
  await expect(page.getByTestId("performance-kpi-goal-progress")).toBeVisible();

  let goalsFetches = 0;
  await page.route("**/rest/v1/goals*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    goalsFetches += 1;
    await injectGoalsResponse(route);
  });

  await page.getByTestId("performance-refresh").click();
  await expect
    .poll(() => goalsFetches, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(1);
  await expect(goalSection.getByText("E2E mocked goal refresh")).toBeVisible();
  await expect(page.getByTestId(`performance-goal-row-${GOAL_ID}`)).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/goals-refresh-mock-depth.png",
  });
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
  await page.route("**/rest/v1/goal_participants*", async (route) => {
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

async function injectMockGoal(page: Page) {
  await page.route("**/rest/v1/goals*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await injectGoalsResponse(route);
  });
  await page.route("**/rest/v1/goal_participants*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const userId = signedInUserId;
    if (!userId) {
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
      return;
    }
  const injected = {
    id: PARTICIPANT_ID,
    goal_id: GOAL_ID,
    user_id: userId,
    role: "owner",
    contribution_score: 72,
  };
  const merged = [
    ...rows.filter((row) => (row as { id?: string }).id !== PARTICIPANT_ID),
    injected,
  ];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify(merged),
  });
  });
}

async function injectGoalsResponse(route: Route) {
  const response = await route.fetch();
  const json = await readFetchJson(response);
  const rows = Array.isArray(json) ? json : [];
  const companyId =
    signedInCompanyId ??
    (rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null);
  const createdAt = new Date().toISOString();
  const injected = {
    id: GOAL_ID,
    title: "E2E mocked goal refresh",
    status: "active",
    progress: 65,
    target_completion_date: createdAt.slice(0, 10),
    created_at: createdAt,
    company_id: companyId,
  };
  const merged = [
    ...rows.filter((row) => (row as { id?: string }).id !== GOAL_ID),
    injected,
  ];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify(merged),
  });
}