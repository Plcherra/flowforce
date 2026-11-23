import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const GROUP_ALPHA_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const GROUP_BETA_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const DIRECT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PEER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ALPHA_NAME = "Ops standup";
const BETA_NAME = "E2E group beta";
let signedInUserId = "";

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
      const body = Array.isArray(json) ? json.map(pin) : pin(json);
      if (Array.isArray(body)) {
        const row = body.find(
          (item) => item && typeof item === "object" && "id" in item,
        ) as { id?: string } | undefined;
        if (row?.id) signedInUserId = row.id;
      } else if (body && typeof body === "object" && "id" in body) {
        signedInUserId = String((body as { id: string }).id);
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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("roster filters, group vs direct chips, and empty search", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await injectRosterChannels(page);

  await page.goto("/app/messages");
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });

  const directChip = page
    .getByTestId("chat-channel")
    .filter({ hasText: "Jamie Peer" });
  const groupChip = page
    .getByTestId("chat-channel")
    .filter({ hasText: `${BETA_NAME} · group` });
  await expect(directChip).toBeVisible({ timeout: 20_000 });
  await expect(groupChip).toBeVisible();

  await page.goto("/app/messages/teams");
  await expect(directChip).toHaveCount(0);
  await expect(groupChip).toBeVisible();

  await page.goto("/app/messages/unread");
  const unreadOnly = page.getByTestId("chat-channel").filter({ hasText: ALPHA_NAME });
  await expect(unreadOnly).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("chat-channel").filter({ hasText: BETA_NAME })).toHaveCount(0);

  await page.goto("/app/messages");
  await page.locator("#message-roster-search").fill("no-such-chat-xyz");
  await expect(page.getByTestId("message-roster-empty")).toBeVisible();
  await expect(page.getByTestId("chat-channel")).toHaveCount(0);

  await page.locator("#message-roster-search").fill(BETA_NAME);
  await expect(groupChip).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-roster-edge.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fmessages");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function injectRosterChannels(page: Page) {
  await page.route("**/rest/v1/channel_members*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const userId = signedInUserId || "99999999-9999-4999-8999-999999999999";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ channel_id: GROUP_BETA_ID, user_id: userId }),
    });
  });

  await page.route("**/rest/v1/message_channels*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? [...json] : [];
      const companyId =
        rows[0] && typeof rows[0] === "object"
          ? ((rows[0] as { company_id?: string }).company_id ?? null)
          : null;
      const userId = signedInUserId || GROUP_ALPHA_ID;
      const readStale = "2026-11-20T08:00:00.000Z";
      const updatedUnread = "2026-11-22T14:00:00.000Z";
      const updatedRead = "2026-11-22T08:00:00.000Z";
      const extras = [
        {
          id: GROUP_ALPHA_ID,
          name: ALPHA_NAME,
          description: null,
          type: "group",
          company_id: companyId,
          is_private: false,
          created_by: userId,
          created_at: updatedUnread,
          updated_at: updatedUnread,
          channel_members: [
            {
              user_id: userId,
              role: "admin",
              last_read_at: readStale,
              first_name: "Playwright",
              last_name: "Owner",
            },
          ],
        },
        {
          id: GROUP_BETA_ID,
          name: BETA_NAME,
          description: null,
          type: "group",
          company_id: companyId,
          is_private: false,
          created_by: userId,
          created_at: updatedRead,
          updated_at: updatedRead,
          channel_members: [
            {
              user_id: userId,
              role: "admin",
              last_read_at: updatedRead,
              first_name: "Playwright",
              last_name: "Owner",
            },
          ],
        },
        {
          id: DIRECT_ID,
          name: "Jamie Peer",
          description: null,
          type: "direct",
          company_id: companyId,
          is_private: true,
          created_by: userId,
          created_at: updatedRead,
          updated_at: updatedRead,
          channel_members: [
            {
              user_id: userId,
              role: "member",
              last_read_at: updatedRead,
              first_name: "Playwright",
              last_name: "Owner",
            },
            {
              user_id: PEER_ID,
              role: "member",
              last_read_at: null,
              first_name: "Jamie",
              last_name: "Peer",
            },
          ],
        },
      ];
      const ids = new Set(
        rows
          .filter((row) => row && typeof row === "object")
          .map((row) => (row as { id?: string }).id),
      );
      return [...rows, ...extras.filter((row) => !ids.has(row.id))];
    });
  });

  await page.route("**/rest/v1/messages*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    await fulfillGetWithJson(route, () => []);
  });
}