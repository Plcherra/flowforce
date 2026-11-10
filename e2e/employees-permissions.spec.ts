import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const DIRECTORY_READ = ["directory.view"] as const;
const PEOPLE = ["manageUsers"] as const;

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

test("directory.view, manageUsers, invite, CSV export, and resend gates", async ({ page }) => {
  test.setTimeout(180_000);
  await blockInviteWrites(page);
  await signIn(page);

  await denyKeys(page, [...DIRECTORY_READ]);
  await page.reload();
  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-directory-hidden")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("employees-invite-button")).toHaveCount(0);

  await allowKeys(page, [...DIRECTORY_READ]);
  await denyKeys(page, [...PEOPLE]);
  await pinStaffRole(page);
  await page.reload();
  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("employees-invite-button")).toHaveCount(0);
  await expect(page.getByTestId("employees-csv-export")).toHaveCount(0);

  const invitedBadge = page.getByTestId("directory-status").filter({
    hasText: "Invited, not signed in yet",
  });
  if ((await invitedBadge.count()) > 0) {
    await page
      .getByTestId("directory-status")
      .filter({ hasText: "Invited, not signed in yet" })
      .first()
      .locator("xpath=ancestor::tr")
      .getByRole("button")
      .click();
    await expect(page.getByTestId("directory-resend")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }

  await allowKeys(page, [...DIRECTORY_READ, ...PEOPLE]);
  await pinStaffRole(page);
  await page.reload();
  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-invite-button")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("employees-csv-export")).toBeVisible();

  await page.getByTestId("employees-invite-button").click();
  await expect(page.getByTestId("invite-dialog")).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("Escape");

  await page.screenshot({ path: "/opt/cursor/artifacts/employees-directory-qa.png", fullPage: true });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Femployees");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function blockInviteWrites(page: Page) {
  await page.route("**/api/employees/invite**", async (route) => {
    if (route.request().method() === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

async function pinStaffRole(page: Page) {
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
        role: "staff",
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
