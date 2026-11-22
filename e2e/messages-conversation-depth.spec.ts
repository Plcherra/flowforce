import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MESSAGE_KEYS = ["messages.send", "messages.manage"] as const;
const CHANNEL_ALPHA_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const CHANNEL_BETA_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ALPHA_NAME = "E2E Alpha chat";
const BETA_NAME = "E2E Beta chat";
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

test("channel chips, roster search, transcript, and composer send gate", async ({ page }) => {
  test.setTimeout(120_000);
  let sendAttempted = false;
  await signIn(page);
  await injectChannels(page, () => {
    sendAttempted = true;
  });

  await page.goto("/app/messages");
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("chat-channel").filter({ hasText: ALPHA_NAME })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("chat-channel").filter({ hasText: BETA_NAME })).toBeVisible();

  await page.locator("#message-roster-search").fill("Beta");
  await expect(page.getByTestId("chat-channel").filter({ hasText: BETA_NAME })).toBeVisible();
  await expect(page.getByTestId("chat-channel").filter({ hasText: ALPHA_NAME })).toHaveCount(0);
  await page.locator("#message-roster-search").fill("");

  await openChannel(page, BETA_NAME);
  await expect(page.getByTestId("chat-transcript")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("chat-bubble")).toContainText("Hello from e2e");

  const composer = page.getByTestId("chat-composer");
  await expect(composer).toBeVisible();
  const send = composer.getByRole("button", { name: "Send" });
  await expect(send).toBeDisabled();
  await composer.getByRole("textbox").fill("Draft only");
  await expect(send).toBeEnabled();
  await send.click();
  await expect.poll(() => sendAttempted, { timeout: 15_000 }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-conversation-depth.png" });
});

test("messages.send deny disables the composer", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await injectChannels(page);
  await showOnly(page, ["messages.manage"]);
  await page.goto("/app/messages");
  await openChannel(page, ALPHA_NAME);
  const composer = page.getByTestId("chat-composer");
  await expect(composer.getByRole("textbox")).toBeDisabled();
  await expect(composer.getByRole("button", { name: "Send" })).toBeDisabled();
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-composer-gated.png" });
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

async function injectChannels(page: Page, onSend?: () => void) {
  await page.route("**/rest/v1/channel_members*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const url = request.url();
    const userId = signedInUserId || creatorFallback();
    if (!url.includes(userId) && !url.includes(CHANNEL_BETA_ID) && !url.includes(CHANNEL_ALPHA_ID)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ channel_id: CHANNEL_BETA_ID, user_id: userId }),
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
      const creator = signedInUserId || CHANNEL_ALPHA_ID;
      const member = signedInUserId
        ? [{ user_id: signedInUserId, role: "admin", last_read_at: null }]
        : [];
      const stamp = "2026-11-22T12:00:00.000Z";
      const extras = [
        {
          id: CHANNEL_ALPHA_ID,
          name: ALPHA_NAME,
          description: null,
          type: "group",
          company_id: companyId,
          is_private: false,
          created_by: creator,
          created_at: stamp,
          updated_at: stamp,
          channel_members: member,
        },
        {
          id: CHANNEL_BETA_ID,
          name: BETA_NAME,
          description: null,
          type: "group",
          company_id: companyId,
          is_private: false,
          created_by: creator,
          created_at: stamp,
          updated_at: stamp,
          channel_members: member,
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
    const request = route.request();
    if (request.method() !== "GET") {
      onSend?.();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          channel_id: CHANNEL_BETA_ID,
          content: "Draft only",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      return;
    }
    const url = request.url();
    if (!url.includes(CHANNEL_BETA_ID)) {
      await fulfillGetWithJson(route, () => []);
      return;
    }
    const sender = signedInUserId || creatorFallback();
    await fulfillGetWithJson(route, () => [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        channel_id: CHANNEL_BETA_ID,
        sender_id: sender,
        content: "Hello from e2e",
        created_at: "2026-11-22T13:00:00.000Z",
        updated_at: "2026-11-22T13:00:00.000Z",
        attachments: [],
        senderprofile: {
          first_name: "Playwright",
          last_name: "Owner",
          avatar_url: null,
        },
      },
    ]);
  });
}

function creatorFallback() {
  return "99999999-9999-4999-8999-999999999999";
}

async function openChannel(page: Page, name: string) {
  const chip = page.getByTestId("chat-channel").filter({ hasText: name });
  await expect(chip).toBeVisible({ timeout: 30_000 });
  await chip.click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function showOnly(page: Page, allow: string[]) {
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
      return !MESSAGE_KEYS.includes(key as (typeof MESSAGE_KEYS)[number]);
    });
    const denied = MESSAGE_KEYS.filter((key) => !allow.includes(key)).map((key) => ({
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