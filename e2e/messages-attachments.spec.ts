import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { missingE2eEnv } from "./required-env";

const fixturePng = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "tiny-e2e.png",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("composer uploads an attachment and blocks message persistence", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let storageUploads = 0;
  await page.route("**/storage/v1/object/**", async (route) => {
    const method = route.request().method();
    if (method === "POST" || method === "PUT") {
      storageUploads += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          Key: "company/mock/messages/channel/e2e.png",
        }),
      });
      return;
    }
    await route.continue();
  });

  const messagePosts: string[] = [];
  await page.route("**/rest/v1/messages*", async (route) => {
    if (route.request().method() === "POST") {
      messagePosts.push(route.request().postData() ?? "");
      const now = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-stub-message",
          channel_id: "e2e-channel",
          sender_id: "e2e-sender",
          content: "e2e attachment",
          created_at: now,
          updated_at: now,
          attachments: [],
        }),
      });
      return;
    }
    await route.continue();
  });

  await signIn(page);
  await page.goto("/app/messages");
  const channel = page.locator('[data-testid="chat-channel"]').first();
  await expect(channel).toBeVisible({ timeout: 30_000 });
  await channel.click();

  const composer = page.getByTestId("chat-composer");
  await expect(composer).toBeVisible({ timeout: 20_000 });
  const attach = page.getByRole("button", { name: "Attach file" });
  await expect(attach).toBeVisible();

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    attach.click(),
  ]);
  await fileChooser.setFiles(fixturePng);

  await expect(page.getByText("tiny-e2e.png")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/messages-composer-attachment.png",
    fullPage: true,
  });
  expect(storageUploads).toBeGreaterThan(0);

  await composer.locator('button[type="submit"]').click();
  await expect.poll(() => messagePosts.length).toBeGreaterThan(0);
  const payload = messagePosts.join("\n");
  expect(payload).toContain("tiny-e2e.png");
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fmessages");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
