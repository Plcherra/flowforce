import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Two signed-in browsers. Credentials come from the environment.
 * This file does not read or use a service role key.
 */
const ownerEmail = process.env.TEST_USER_EMAIL ?? "";
const ownerPassword = process.env.TEST_USER_PASSWORD ?? "";
const recipientEmail = process.env.TEST_RECIPIENT_EMAIL ?? "";
const recipientPassword = process.env.TEST_RECIPIENT_PASSWORD ?? "";
const ownerName = process.env.TEST_USER_NAME ?? "Playwright Owner";
const recipientName = process.env.TEST_RECIPIENT_NAME ?? "Relay Tester";

test.beforeEach(async ({ page }) => {
  await pinEnglish(page);
});

test("a direct message arrives in the other account as a chat", async ({
  page,
  browser,
}) => {
  test.skip(
    !ownerEmail || !ownerPassword || !recipientEmail || !recipientPassword,
    "TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_RECIPIENT_EMAIL, and TEST_RECIPIENT_PASSWORD are required.",
  );

  const text = `e2e-chat-${Date.now()}`;
  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();
  await pinEnglish(recipientPage);

  try {
    await signIn(recipientPage, recipientEmail, recipientPassword);
    await recipientPage.goto("/app/messages");
    await expect(recipientPage.getByTestId("new-chat")).toBeVisible({
      timeout: 30_000,
    });

    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/app/messages");
    await page.getByTestId("new-chat").click();
    await page.locator("#new-chat-search").fill(recipientName.split(" ")[0] ?? recipientName);
    await page.getByRole("button", { name: recipientName }).click();
    const composer = page.getByTestId("chat-composer");
    await expect(composer).toBeVisible();
    await composer.locator("textarea").fill(text);
    await composer.locator('button[type="submit"]').click();

    const own = page.locator('[data-testid="chat-bubble"][data-own="true"]', {
      hasText: text,
    });
    await expect(own).toBeVisible({ timeout: 20_000 });
    await expect(own).toHaveClass(/justify-end/);
    await expect(own.locator("time")).toBeVisible();
    await expect(own.getByRole("button", { name: "Open thread" })).toHaveCount(0);
    await expect(own.getByRole("button", { name: "Reply" })).toHaveCount(0);

    const transcript = await page.getByTestId("chat-transcript").boundingBox();
    const composerBox = await composer.boundingBox();
    expect(transcript).toBeTruthy();
    expect(composerBox).toBeTruthy();
    expect(composerBox!.y).toBeGreaterThan(transcript!.y);

    const chip = recipientPage.locator(
      `[data-testid="chat-channel"][data-channel-name="${ownerName}"]`,
    );
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await chip.click();
    const incoming = recipientPage.locator(
      '[data-testid="chat-bubble"][data-own="false"]',
      { hasText: text },
    );
    await expect(incoming).toBeVisible({ timeout: 20_000 });
    await expect(incoming).toHaveClass(/justify-start/);
    await expect(incoming.locator("time")).toBeVisible();
    await expect(
      recipientPage.getByRole("button", { name: "Open thread" }),
    ).toHaveCount(0);

    await saveChatShots(recipientPage, text);
  } finally {
    await recipientContext.close();
  }
});

async function pinEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth?redirectTo=%2Fapp%2Fmessages");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function saveChatShots(page: Page, text: string) {
  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
  } catch {
    return;
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByText(text)).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/messages-chat-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText(text)).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/messages-chat-mobile.png",
    fullPage: true,
  });
}
