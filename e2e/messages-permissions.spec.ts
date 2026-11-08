import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const MESSAGE_KEYS = ["messages.send", "messages.manage"] as const;

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

test("messages new chat form follows send and manage separately", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.route("**/rest/v1/message_channels*", async (route) => {
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
  await page.route("**/rest/v1/messages*", async (route) => {
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

  await page.goto("/app/messages");
  const newChat = page.getByTestId("new-chat");
  await expect(newChat).toBeVisible({ timeout: 30_000 });
  await newChat.click();
  await expect(page.getByRole("heading", { name: "Choose someone" })).toBeVisible();
  await page.getByRole("button", { name: "Create a new group" }).click();
  await expect(page.getByRole("heading", { name: "Who is in this group?" })).toBeVisible();
  await expect(page.getByLabel("Group name")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-new-group.png" });

  await showOnly(page, []);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("new-chat")).toHaveCount(0);

  await showOnly(page, ["messages.send"]);
  await page.reload();
  await expect(page.getByTestId("new-chat")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "/opt/cursor/artifacts/messages-send-only.png" });
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

async function showOnly(page: Page, allow: string[]) {
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
