import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PEER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PEER_LABEL = "Jamie Peer";
const NEW_GROUP_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GROUP_NAME = "E2E Closing crew";
let signedInUserId = "";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const url = request.url();
    const rosterList = url.includes("employment_status") && url.includes("company_id");
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
      let body = Array.isArray(json) ? json.map(pin) : pin(json);
      if (Array.isArray(body)) {
        body.forEach(capture);
      } else {
        capture(body);
        if (!signedInUserId && body && typeof body === "object" && "id" in body) {
          signedInUserId = String((body as { id: string }).id);
        }
      }
      if (!rosterList || !Array.isArray(body)) {
        return body;
      }
      const companyId =
        body[0] && typeof body[0] === "object"
          ? ((body[0] as { company_id?: string | null }).company_id ?? null)
          : null;
      const hasPeer = body.some(
        (row) => row && typeof row === "object" && (row as { id?: string }).id === PEER_ID,
      );
      const peerRow = {
        id: PEER_ID,
        first_name: "Jamie",
        last_name: "Peer",
        email: "jamie.peer@e2e.flowforce.test",
        employment_status: "active",
        role: "staff",
        avatar_url: null,
        hire_date: null,
        employee_id: null,
        company_id: companyId,
      };
      const merged = hasPeer ? body : [...body, peerRow];
      return merged.filter(
        (row) =>
          !signedInUserId ||
          (row && typeof row === "object" && (row as { id?: string }).id !== signedInUserId),
      );
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

test("new group flow selects members, names channel, and stubs create", async ({ page }) => {
  test.setTimeout(120_000);
  let channelCreateBody: Record<string, unknown> | null = null;
  let memberInserts = 0;

  await signIn(page);
  await installGroupCreateMocks(page, {
    onChannelCreate: (body) => {
      channelCreateBody = body;
    },
    onMemberInsert: () => {
      memberInserts += 1;
    },
  });

  await page.goto("/app/messages");
  await expect(page.getByTestId("new-chat")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("new-chat").click();
  await expect(page.getByRole("heading", { name: "Choose someone" })).toBeVisible();
  await page.getByRole("button", { name: "Create a new group" }).click();
  await expect(page.getByRole("heading", { name: "Who is in this group?" })).toBeVisible();

  const createBtn = page.getByTestId("new-chat-create-group");
  await expect(createBtn).toBeDisabled();
  await page.getByLabel("Group name").fill(GROUP_NAME);
  await expect(createBtn).toBeDisabled();

  const peer = page.getByRole("button", { name: new RegExp(PEER_LABEL) });
  await expect(peer).toBeVisible({ timeout: 30_000 });
  await peer.click();
  await expect(createBtn).toBeEnabled();

  await createBtn.click();
  await expect.poll(() => channelCreateBody, { timeout: 20_000 }).not.toBeNull();
  await expect.poll(() => memberInserts, { timeout: 20_000 }).toBeGreaterThan(0);

  expect(channelCreateBody).toMatchObject({
    name: GROUP_NAME,
    type: "group",
    is_private: true,
  });

  await expect(page.getByRole("heading", { name: "Who is in this group?" })).toHaveCount(0);
  await expect(
    page.getByTestId("chat-channel").filter({ hasText: GROUP_NAME }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("chat-transcript")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-group-complete.png" });
});

test("cancel closes new group without channel writes", async ({ page }) => {
  test.setTimeout(120_000);
  let channelWrite = false;
  await signIn(page);
  await page.route("**/rest/v1/message_channels*", async (route) => {
    if (route.request().method() !== "GET") {
      channelWrite = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.continue();
  });
  await page.route("**/rest/v1/channel_members*", async (route) => {
    if (route.request().method() !== "GET") {
      channelWrite = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.continue();
  });

  await page.goto("/app/messages");
  await expect(page.getByTestId("new-chat")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("new-chat").click();
  await page.getByRole("button", { name: "Create a new group" }).click();
  await page.getByLabel("Group name").fill("Should not save");
  await page.getByRole("button", { name: new RegExp(PEER_LABEL) }).click({ timeout: 30_000 });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Who is in this group?" })).toHaveCount(0);
  expect(channelWrite).toBe(false);
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

async function installGroupCreateMocks(
  page: Page,
  hooks: {
    onChannelCreate: (body: Record<string, unknown>) => void;
    onMemberInsert: () => void;
  },
) {
  let createdChannel: Record<string, unknown> | null = null;

  await page.route("**/rest/v1/message_channels*", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await fulfillGetWithJson(route, (json) => {
        const rows = Array.isArray(json) ? [...json] : [];
        if (!createdChannel) return rows;
        const exists = rows.some(
          (row) =>
            row &&
            typeof row === "object" &&
            (row as { id?: string }).id === NEW_GROUP_ID,
        );
        return exists ? rows : [...rows, createdChannel];
      });
      return;
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      hooks.onChannelCreate(body);
      const companyId =
        typeof body.company_id === "string" ? body.company_id : null;
      const ownerId = signedInUserId || creatorFallback();
      createdChannel = {
        id: NEW_GROUP_ID,
        name: body.name ?? GROUP_NAME,
        description: null,
        type: "group",
        company_id: companyId,
        is_private: body.is_private ?? true,
        created_by: ownerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        channel_members: [
          { user_id: ownerId, role: "admin", last_read_at: null },
          { user_id: PEER_ID, role: "member", last_read_at: null },
        ],
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(createdChannel),
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/rest/v1/channel_members*", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      const url = request.url();
      if (url.includes(NEW_GROUP_ID)) {
        const userMatch = url.match(/user_id=eq\.([^&)]+)/);
        const userId = userMatch
          ? decodeURIComponent(userMatch[1]!)
          : signedInUserId;
        const accept = request.headers().accept ?? "";
        const objectResponse = accept.includes("application/vnd.pgrst.object");
        await route.fulfill({
          status: 200,
          contentType: objectResponse
            ? "application/vnd.pgrst.object+json"
            : "application/json",
          body: JSON.stringify(
            objectResponse
              ? { channel_id: NEW_GROUP_ID, user_id: userId }
              : [{ channel_id: NEW_GROUP_ID, user_id: userId }],
          ),
        });
        return;
      }
      await route.continue();
      return;
    }
    if (request.method() === "POST") {
      hooks.onMemberInsert();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          channel_id: NEW_GROUP_ID,
          user_id: PEER_ID,
          role: "member",
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/rest/v1/messages*", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillGetWithJson(route, () => []);
      return;
    }
    await route.continue();
  });
}

function creatorFallback() {
  return "99999999-9999-4999-8999-999999999999";
}