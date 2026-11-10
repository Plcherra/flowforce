import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { missingE2eEnv } from "./required-env";

const MANAGE_STEPS = ["systemSettings"] as const;
const MANAGE_DOCS = ["documents.manage"] as const;

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

test("preview shows shop welcome, facts, and before your first shift", async ({ page }) => {
  const response = await page.goto("/onboarding-preview?screen=employee");
  test.skip(response?.status() === 404, "The onboarding preview route is disabled in production.");
  await expect(page.getByTestId("employee-onboarding")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome to the shop" })).toBeVisible();
  await expect(page.getByText("Your first days on the floor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before your first shift" })).toBeVisible();
  await expect(page.getByTestId("onboarding-welcome")).toContainText("Harbor Coffee");
  await expect(page.getByTestId("onboarding-finish")).toBeDisabled();
  screenshot(page, "employee-onboarding-welcome-preview");
});

test("preview settings shows welcome editor, steps, and hire checklist preview", async ({ page }) => {
  const settings = await page.goto("/onboarding-preview?screen=settings");
  test.skip(settings?.status() === 404, "The onboarding preview route is disabled in production.");
  await expect(page.getByTestId("onboarding-settings")).toBeVisible();
  await expect(page.getByLabel("Welcome title")).toHaveValue("Welcome to Harbor Coffee");
  await expect(page.getByTestId("onboarding-steps")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save welcome" })).toBeVisible();

  const hire = await page.goto("/onboarding-preview?screen=hire");
  test.skip(hire?.status() === 404, "The onboarding preview route is disabled in production.");
  await expect(page.getByTestId("hiring-checklist")).toBeVisible();
  await expect(page.getByTestId("hiring-check-share_card")).toContainText("Welcome to the shop");
  await expect(page.getByTestId("onboarding-welcome")).toHaveCount(0);
  screenshot(page, "employee-onboarding-settings-preview");
});

test("systemSettings gates welcome, hiring builder, and steps; documents.manage keeps uploads", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockOnboardingWrites(page);
  await signIn(page);

  await page.goto("/app/settings?tab=onboarding");
  await expect(page.getByTestId("onboarding-settings")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Save welcome" })).toBeVisible();
  await expect(page.getByTestId("hiring-save")).toBeVisible();
  await expect(page.getByTestId("onboarding-add-step")).toBeVisible();

  await pinManagerRole(page);
  await denyKeys(page, [...MANAGE_STEPS]);
  await allowKeys(page, [...MANAGE_DOCS]);
  await page.reload();
  await expect(page.getByTestId("onboarding-settings")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Save welcome" })).toHaveCount(0);
  await expect(page.getByTestId("hiring-save")).toHaveCount(0);
  await expect(page.getByTestId("hiring-add-collect_file")).toHaveCount(0);
  await expect(page.getByTestId("onboarding-add-step")).toHaveCount(0);
  await expect(page.getByTestId("onboarding-document-upload")).toBeVisible();

  screenshot(page, "employee-onboarding-settings-docs-only");
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fsettings%3Ftab%3Donboarding");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockOnboardingWrites(page: Page) {
  const patterns = [
    "**/rest/v1/employee_onboarding_settings*",
    "**/rest/v1/employee_onboarding_steps*",
    "**/rest/v1/employee_onboarding_documents*",
    "**/rest/v1/hiring_blocks*",
    "**/storage/v1/object/**",
  ];
  for (const pattern of patterns) {
    await page.route(pattern, async (route) => {
      if (route.request().method() === "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
  }
}

async function pinManagerRole(page: Page) {
  await page.unroute("**/rest/v1/profiles*").catch(() => undefined);
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const demote = (row: unknown) => {
      if (!row || typeof row !== "object") return row;
      return {
        ...(row as Record<string, unknown>),
        role: "manager",
        language: "en",
      };
    };
    const body = Array.isArray(json) ? json.map(demote) : demote(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
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
    const denySet = new Set(keys);
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return key && !denySet.has(key);
    });
    const denied = keys.map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...denied, ...kept]),
    });
  });
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
    const allowSet = new Set(keys);
    const granted = keys.map((key) => ({
      permission_key: key,
      permission_value: "allow",
    }));
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return key && !allowSet.has(key);
    });
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...granted, ...kept]),
    });
  });
}

function screenshot(page: Page, name: string) {
  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    void page.screenshot({ path: `/opt/cursor/artifacts/${name}.png`, fullPage: true });
  } catch {
    // Optional in local runs.
  }
}
