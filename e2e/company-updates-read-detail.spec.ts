import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const UPDATE_ID = "88888888-8888-4888-8888-888888888878";

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

test("feed card shows mocked update body, view tracking, and comment gate", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let viewTracked = false;
  let commentAttempted = false;
  await blockUpdateWrites(page, {
    onView: () => {
      viewTracked = true;
    },
    onComment: () => {
      commentAttempted = true;
    },
  });
  await installPublishedUpdate(page);
  await signIn(page);

  await page.goto("/app/company-updates");
  await expect(page.getByTestId("company-updates-page")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Feed" }).click();

  const card = page.getByTestId(`company-update-card-${UPDATE_ID}`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByTestId("company-update-body")).toContainText(
    "E2E company update read depth body",
  );
  await expect(card.getByRole("heading", { name: "E2E read detail title" })).toBeVisible();

  await expect.poll(() => viewTracked, { timeout: 20_000 }).toBe(true);

  await card.getByRole("button", { name: "Comment" }).click();
  await card.getByPlaceholder("Write a comment...").fill("E2E read detail comment");
  await card.getByRole("button", { name: "Post" }).click();
  await expect.poll(() => commentAttempted, { timeout: 15_000 }).toBe(true);

  await page.screenshot({
    path: "/opt/cursor/artifacts/company-updates-read-detail.png",
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

async function pinStaffRole(page: Page) {
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
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

async function installPublishedUpdate(page: Page) {
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
        const record = row as { id?: string; company_id?: string | null; language?: string };
        if (record.company_id) companyId = record.company_id;
        if (record.id) profileId = record.id;
        return { ...record, language: "en", role: "staff" };
      };
      return Array.isArray(json) ? json.map(capture) : capture(json);
    });
  });

  const stamp = "2026-11-25T12:00:00.000Z";
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
  const isSingle = url.includes(`id=eq.${UPDATE_ID}`);
    if (isSingle) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const sample = rows[0] as { company_id?: string } | undefined;
    companyId = companyId ?? sample?.company_id ?? url.match(/company_id=eq\.([^&]+)/)?.[1] ?? null;
    const hasFixture = rows.some(
      (row) => row && typeof row === "object" && (row as { id?: string }).id === UPDATE_ID,
    );
    const fixture = {
      id: UPDATE_ID,
      company_id: companyId,
      title: "E2E read detail title",
      body: "E2E company update read depth body",
      rich_content: null,
      update_type: "announcement",
      priority: "normal",
      status: "published",
      background_style: null,
      recipients: { kind: "company" },
      publishing_settings: { engagement: { allowLikes: true, allowComments: true } },
      assigned_employees: [],
      author_id: profileId,
      created_by: profileId,
      author_name: "Playwright QA",
      author_avatar: null,
      author_role: "staff",
      publish_date: stamp,
      scheduled_date: null,
      is_pinned: false,
      likes_count: 0,
      comments_count: 0,
      views_count: 0,
      created_at: stamp,
      updated_at: stamp,
      authorprofile: {
        id: profileId ?? "99999999-9999-4999-8999-999999999999",
        first_name: "Playwright",
        last_name: "QA",
        avatar_url: null,
        role: "staff",
      },
      company_update_engagement: [],
    };
    void hasFixture;
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

async function blockUpdateWrites(
  page: Page,
  hooks: { onView?: () => void; onComment?: () => void } = {},
) {
  await page.route("**/rest/v1/company_update_reactions*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    const url = decodeURIComponent(route.request().url());
    if (url.includes("reaction_type=view") || route.request().postData()?.includes("view")) {
      hooks.onView?.();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
  await page.route("**/rest/v1/company_update_comments*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    hooks.onComment?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "00000000-0000-4000-8000-0000000000c1" }),
    });
  });
}