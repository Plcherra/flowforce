import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const DEPT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DEPT_NAME = "E2E Front of house";
const POSITION_KEYS = ["managePositions", "systemSettings"] as const;

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

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("departments card lists rows and blocks table writes", async ({ page }) => {
  test.setTimeout(120_000);
  await blockDepartmentWrites(page);
  await signIn(page);
  await injectDepartments(page);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("department-settings")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(`department-row-${DEPT_ID}`)).toBeVisible();
  await expect(page.getByTestId("department-name-input")).toBeVisible();
  await expect(page.getByTestId(`department-remove-${DEPT_ID}`)).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/settings-departments-owner.png" });
});

test("departments card hides when managePositions and systemSettings are denied", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await blockDepartmentWrites(page);
  await signIn(page);
  await injectDepartments(page);
  await denyPositionKeys(page, [...POSITION_KEYS]);

  await page.goto("/app/settings?tab=general");
  await expect(page.getByTestId("settings-standard-theme")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("department-settings")).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/settings-departments-denied.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings%3Ftab%3Dgeneral");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function injectDepartments(page: Page) {
  await page.route("**/rest/v1/departments*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? [...json] : [];
      const hasMock = rows.some(
        (row) => row && typeof row === "object" && (row as { id?: string }).id === DEPT_ID,
      );
      if (hasMock) return rows;
      return [
        ...rows,
        {
          id: DEPT_ID,
          name: DEPT_NAME,
        },
      ];
    });
  });
}

async function blockDepartmentWrites(page: Page) {
  await page.route("**/rest/v1/departments*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: DEPT_ID }),
    });
  });
}

async function denyPositionKeys(page: Page, deny: string[]) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !deny.includes(key);
    });
    const overrides = deny.map((key) => ({
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