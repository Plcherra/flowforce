import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MESSAGE_KEYS = ["messages.send", "messages.manage"] as const;
const CHANNEL_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CHANNEL_NAME = "E2E delete chat";
const OWN_MESSAGE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PEER_MESSAGE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PEER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let signedInUserId = "";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const testEmail = process.env.TEST_USER_EMAIL ?? "";
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      const capture = (row: unknown) => {
        if (!row || typeof row !== "object") return;
        const record = row as { id?: string; email?: string | null };
        if (testEmail && record.email === testEmail && record.id) {
          signedInUserId = record.id;
        }
      };
      const body = Array.isArray(json) ? json.map(pin) : pin(json);
      if (Array.isArray(body)) {
        body.forEach(capture);
      } else {
        capture(body);
        if (!signedInUserId && body && typeof body === "object" && "id" in body) {
          signedInUserId = String((body as { id: string }).id);
        }
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

test("own message delete opens confirm and stubs REST delete", async ({ page }) => {
  test.setTimeout(120_000);
  let deleteAttempted = false;
  await signIn(page);
  await expect.poll(() => signedInUserId.length > 0, { timeout: 20_000 }).toBeTruthy();
  await denyKeys(page, ["messages.manage"]);
  await injectChannelWithMessages(page, {
    onDelete: () => {
      deleteAttempted = true;
    },
  });

  await page.goto("/app/messages");
  await openChannel(page);

  const ownBubble = page.getByTestId("chat-bubble").filter({ hasText: "Own message e2e" });
  await expect(ownBubble).toHaveAttribute("data-own", "true");
  const deleteBtn = ownBubble.getByTestId("chat-delete");
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "Delete message" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect.poll(() => deleteAttempted, { timeout: 15_000 }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-delete-own.png" });
});

test("peer message delete follows messages.manage, not send alone", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await expect.poll(() => signedInUserId.length > 0, { timeout: 20_000 }).toBeTruthy();
  await showOnly(page, ["messages.send"]);
  await injectChannelWithMessages(page);

  await page.goto("/app/messages");
  await openChannel(page);
  await expect(page.getByTestId("chat-bubble").filter({ hasText: "Peer message e2e" })).toBeVisible();
  await expect(
    page.getByTestId("chat-bubble").filter({ hasText: "Peer message e2e" }).getByTestId("chat-delete"),
  ).toHaveCount(0);

  await showOnly(page, ["messages.send", "messages.manage"]);
  await page.reload();
  await openChannel(page);
  const peerDelete = page
    .getByTestId("chat-bubble")
    .filter({ hasText: "Peer message e2e" })
    .getByTestId("chat-delete");
  await expect(peerDelete).toBeVisible();
  await peerDelete.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "Delete message" })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-delete-peer-moderate.png" });
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

async function injectChannelWithMessages(
  page: Page,
  hooks?: { onDelete?: () => void },
) {
  await page.route("**/rest/v1/channel_members*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const userId = signedInUserId || fallbackUserId();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ channel_id: CHANNEL_ID, user_id: userId }),
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
      const userId = signedInUserId || fallbackUserId();
      const stamp = "2026-11-25T12:00:00.000Z";
      const extra = {
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        description: null,
        type: "group",
        company_id: companyId,
        is_private: false,
        created_by: userId,
        created_at: stamp,
        updated_at: stamp,
        channel_members: [{ user_id: userId, role: "admin", last_read_at: null }],
      };
      const ids = new Set(
        rows
          .filter((row) => row && typeof row === "object")
          .map((row) => (row as { id?: string }).id),
      );
      return ids.has(CHANNEL_ID) ? rows : [...rows, extra];
    });
  });

  await page.route("**/rest/v1/messages*", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "DELETE") {
      hooks?.onDelete?.();
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (method !== "GET") {
      await route.continue();
      return;
    }
    const url = request.url();
    if (!url.includes(CHANNEL_ID)) {
      await fulfillGetWithJson(route, () => []);
      return;
    }
    const self = signedInUserId || fallbackUserId();
    await fulfillGetWithJson(route, () => [
      {
        id: OWN_MESSAGE_ID,
        channel_id: CHANNEL_ID,
        sender_id: self,
        senderid: self,
        content: "Own message e2e",
        created_at: "2026-11-25T13:00:00.000Z",
        updated_at: "2026-11-25T13:00:00.000Z",
        attachments: [],
        senderprofile: {
          first_name: "Playwright",
          last_name: "Owner",
          avatar_url: null,
        },
      },
      {
        id: PEER_MESSAGE_ID,
        channel_id: CHANNEL_ID,
        sender_id: PEER_ID,
        senderid: PEER_ID,
        content: "Peer message e2e",
        created_at: "2026-11-25T13:05:00.000Z",
        updated_at: "2026-11-25T13:05:00.000Z",
        attachments: [],
        senderprofile: {
          first_name: "Floor",
          last_name: "Peer",
          avatar_url: null,
        },
      },
    ]);
  });
}

function fallbackUserId() {
  return "99999999-9999-4999-8999-999999999999";
}

async function openChannel(page: Page) {
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const chip = page.getByTestId("chat-channel").filter({ hasText: CHANNEL_NAME });
  await expect(chip).toBeVisible({ timeout: 30_000 });
  await chip.click();
  await expect(page.getByRole("heading", { name: CHANNEL_NAME, exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-transcript")).toBeVisible({ timeout: 20_000 });
}

async function denyKeys(page: Page, deny: string[]) {
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