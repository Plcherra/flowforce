import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const MESSAGE_KEYS = ["messages.send", "messages.manage"] as const;
const GROUP_CHANNEL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GROUP_NAME = "E2E Floor Chat";
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

test("group channel settings follow messages.manage, not send alone", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await blockChannelWrites(page);

  await showOnly(page, ["messages.send"]);
  await injectGroupChannel(page);
  await page.goto("/app/messages");
  await openGroupChannel(page);
  await expect(page.getByRole("button", { name: "Group options" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Group members" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-send-no-settings.png" });

  await showOnly(page, ["messages.send", "messages.manage"]);
  await page.reload();
  await openGroupChannel(page);
  await page.getByRole("button", { name: "Group options" }).click();
  await page.getByRole("menuitem", { name: "Group settings" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Group settings" })).toBeVisible();
  await expect(page.getByLabel("Group name")).toHaveValue(GROUP_NAME);
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-channel-settings.png" });
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

async function injectGroupChannel(page: Page) {
  await page.route("**/rest/v1/message_channels*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? [...json] : [];
      const hasGroup = rows.some(
        (row) =>
          row &&
          typeof row === "object" &&
          (row as { id?: string }).id === GROUP_CHANNEL_ID,
      );
      if (hasGroup) return rows;
      const companyId =
        rows[0] && typeof rows[0] === "object"
          ? ((rows[0] as { company_id?: string }).company_id ?? null)
          : null;
      const creator = signedInUserId || GROUP_CHANNEL_ID;
      return [
        ...rows,
        {
          id: GROUP_CHANNEL_ID,
          name: GROUP_NAME,
          description: "QA group channel",
          type: "group",
          company_id: companyId,
          is_private: false,
          created_by: creator,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          channel_members: signedInUserId
            ? [{ user_id: signedInUserId, role: "admin", last_read_at: null }]
            : [],
        },
      ];
    });
  });
  await page.route("**/rest/v1/messages*", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillGetWithJson(route, () => []);
      return;
    }
    await route.continue();
  });
}

async function openGroupChannel(page: Page) {
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const chip = page.getByTestId("chat-channel").filter({ hasText: "E2E Floor Chat" });
  await expect(chip).toBeVisible({ timeout: 30_000 });
  await chip.click();
  await expect(page.getByRole("heading", { name: GROUP_NAME, exact: true })).toBeVisible();
}

async function blockChannelWrites(page: Page) {
  await page.route("**/rest/v1/message_channels*", async (route) => {
    if (route.request().method() === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
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
