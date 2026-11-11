import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";

const MANAGE_KEYS = ["updates.manage", "systemSettings", "admin.settings"] as const;

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

test("overview cards use highlight tint, pack gates HR readiness, and updates.manage gates add", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await signIn(page);
  await blockCompanyUpdateWrites(page);

  await page.goto("/app/dashboard");
  await expect(page.getByTestId("role-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("overview-my-shift")).toBeVisible();
  await expect(page.getByTestId("overview-my-lists")).toBeVisible();
  await expect(page.getByTestId("overview-company-updates")).toBeVisible();

  const myShift = page.getByTestId("overview-my-shift");
  await expect(myShift).toHaveClass(/border-primary\/30/);
  await expect(myShift).toHaveClass(/bg-primary\/5/);

  const myLists = page.getByTestId("overview-my-lists");
  await expect(myLists).toHaveClass(/border-secondary\/40/);
  await expect(myLists).toHaveClass(/bg-secondary\/20/);

  await expect(page.getByTestId("insights-hr-readiness")).toHaveCount(0);

  const addUpdate = page.getByTestId("company-updates-dashboard-add");
  if ((await addUpdate.count()) > 0) {
    await expect(addUpdate).toBeVisible();
  }

  await pinStaffRole(page);
  await denyManageKeys(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("role-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("company-updates-dashboard-add")).toHaveCount(0);

  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("overview-my-shift")).toHaveClass(/bg-primary\/5/);
  await expect(page.getByTestId("overview-my-lists")).toHaveClass(/bg-secondary\/20/);

  await page.screenshot({ path: "/opt/cursor/artifacts/overview-dashboard-qa.png", fullPage: true });
});

test("shows Insights HR readiness on overview when the Insights pack is on", async ({ page }) => {
  await pinPackFlags(page, { team: false, insights: true, stock: false });
  await signIn(page);
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("role-overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("insights-hr-readiness")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("hr-readiness-panel")).toBeVisible();
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinPackFlags(
  page: Page,
  flags: { team: boolean; insights: boolean; stock: boolean },
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: PACK_FLAG_OVERRIDE_STORAGE_KEY, value: flags },
  );
}

async function pinStaffRole(page: Page) {
  await page.unroute("**/rest/v1/profiles*").catch(() => undefined);
  await page.route("**/rest/v1/profiles*", async (route) => {
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

async function blockCompanyUpdateWrites(page: Page) {
  await page.route("**/rest/v1/company_updates*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
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

async function denyManageKeys(page: Page) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
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
