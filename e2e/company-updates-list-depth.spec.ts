import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const UPDATE_ID = "77777777-7777-4777-8777-777777777770";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
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

test("list view shows mocked priority, type badge, and manage menu", async ({ page }) => {
  test.setTimeout(180_000);
  await blockUpdateWrites(page);
  await installListUpdate(page);
  await signIn(page);

  await page.goto("/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const row = page.getByTestId(`company-update-list-row-${UPDATE_ID}`);
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText("E2E list view title")).toBeVisible();
  await expect(row.getByText("High")).toBeVisible();
  await expect(row.getByText("Announcement")).toBeVisible();
  await expect(row.getByRole("button", { name: "Update actions" })).toBeVisible();

  await page.screenshot({
    path: "/opt/cursor/artifacts/company-updates-list-depth.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fcompany-updates");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function installListUpdate(page: Page) {
  let companyId: string | null = null;
  let profileId: string | null = null;
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const capture = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const record = row as {
          id?: string;
          company_id?: string | null;
          language?: string;
        };
        if (record.company_id) companyId = record.company_id;
        if (record.id) profileId = record.id;
        return { ...record, language: "en" };
      };
      return Array.isArray(json) ? json.map(capture) : capture(json);
    });
  });

  const stamp = "2026-11-26T15:00:00.000Z";
  await page.route("**/rest/v1/company_updates*", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method !== "GET" && method !== "HEAD") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    const url = decodeURIComponent(request.url());
    if (url.includes(`id=eq.${UPDATE_ID}`)) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const sample = rows[0] as { company_id?: string } | undefined;
    companyId =
      companyId ??
      sample?.company_id ??
      url.match(/company_id=eq\.([^&]+)/)?.[1] ??
      null;
    const fixture = {
      id: UPDATE_ID,
      company_id: companyId,
      title: "E2E list view title",
      body: "E2E list view body",
      rich_content: null,
      update_type: "announcement",
      priority: "high",
      status: "published",
      background_style: null,
      recipients: { kind: "company" },
      publishing_settings: { engagement: { allowLikes: true, allowComments: true } },
      assigned_employees: [],
      author_id: profileId,
      created_by: profileId,
      author_name: "Playwright QA",
      author_avatar: null,
      author_role: "owner",
      publish_date: stamp,
      scheduled_date: null,
      is_pinned: false,
      likes_count: 2,
      comments_count: 1,
      views_count: 4,
      created_at: stamp,
      updated_at: stamp,
      authorprofile: {
        id: profileId ?? "99999999-9999-4999-8999-999999999999",
        first_name: "Playwright",
        last_name: "QA",
        avatar_url: null,
        role: "owner",
      },
      company_update_engagement: [],
    };
    const body = [fixture];
    const countHeader = request.headers()["prefer"]?.includes("count=exact");
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      headers: countHeader
        ? { "content-range": `0-${body.length - 1}/${body.length}` }
        : undefined,
      body: JSON.stringify(body),
    });
  });
}

async function blockUpdateWrites(page: Page) {
  await page.route("**/rest/v1/company_updates*", async (route) => {
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