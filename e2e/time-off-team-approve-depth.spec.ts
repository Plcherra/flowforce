import { expect, test, type Page } from "@playwright/test";
import { format, addDays } from "date-fns";
import { missingE2eEnv } from "./required-env";

const PENDING_REQUEST_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd64";
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

test("team time off pending row shows approve actions and blocked writes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let approveAttempted = false;
  await installPendingTeamRequest(page, () => {
    approveAttempted = true;
  });
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=staff");
  await expect(page.getByTestId("team-requests")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Time Off" }).click();

  await expect(page.getByTestId("time-off-approve-actions")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("time-off-status")).toContainText(/pending/i);
  await expect(page.getByText("E2E team approve depth", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect.poll(() => approveAttempted, { timeout: 15_000 }).toBe(true);

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-team-approve-depth.png",
  });
});

test("team time off reject action is stubbed without prod write", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let rejectAttempted = false;
  await installPendingTeamRequest(page, () => {
    rejectAttempted = true;
  });
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=staff");
  await expect(page.getByTestId("team-requests")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Time Off" }).click();
  await expect(page.getByTestId("time-off-approve-actions")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect.poll(() => rejectAttempted, { timeout: 15_000 }).toBe(true);

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-team-reject-depth.png",
  });
});

test("deny approveTimeOff switches team time off tab to staff-only view", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await installPendingTeamRequest(page);
  await signIn(page);

  await page.goto("/app/enhanced-scheduling?panel=staff");
  await expect(page.getByTestId("team-requests")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Time Off" }).click();
  await expect(page.getByTestId("time-off-approve-actions")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("E2E team approve depth", { exact: true })).toBeVisible();

  await denyKeys(page, [APPROVE_KEY]);
  await page.reload();
  await expect(page.getByTestId("team-requests")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Time Off" }).click();
  await expect(page.getByTestId("time-off-approve-actions")).toHaveCount(0);
  await expect(page.getByText("E2E team approve depth", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Request history", exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await page.screenshot({
    path: "/opt/cursor/artifacts/time-off-team-approve-denied-mock.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fenhanced-scheduling%3Fpanel%3Dstaff");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function installPendingTeamRequest(page: Page, onWrite?: () => void) {
  const start = format(addDays(new Date(), 10), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 12), "yyyy-MM-dd");
  await page.unroute("**/rest/v1/time_off_requests*").catch(() => undefined);
  await page.route("**/rest/v1/time_off_requests*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      onWrite?.();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    const companyMatch = decodeURIComponent(request.url()).match(
      /company_id=eq\.([^&]+)/,
    );
    const companyId = companyMatch?.[1] ?? null;
    if (!companyId) {
      await route.continue();
      return;
    }
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: PENDING_REQUEST_ID,
          status: "pending",
          type: "vacation",
          start_date: start,
          end_date: end,
          reason: "E2E team approve depth",
          notes: null,
          user_id: "00000000-0000-4000-8000-000000000002",
          company_id: companyId,
          created_at: now,
          updated_at: now,
          approved_by: null,
          approved_at: null,
          user: {
            id: "00000000-0000-4000-8000-000000000002",
            first_name: "E2E",
            last_name: "Teammate",
            avatar_url: null,
            company_id: companyId,
          },
        },
      ]),
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
