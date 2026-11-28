import { expect, test, type Page } from "@playwright/test";
import { deleteTaskFromList } from "./helpers/taskCleanup";
import { missingE2eEnv } from "./required-env";

const PREFIX = "e2e-p1-shift-";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("custom task created on My shift appears on All tasks without manual tab toggle", async ({
  page,
}) => {
  const title = `${PREFIX}${Date.now()}`;
  let created = false;
  try {
    await signIn(page);
    await page.goto("/app/tasks");
    await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("tasks-mode-shift").click();

    await page.getByTestId("tasks-create-button").click();
    await page.getByTestId("tasks-create-menu").getByRole("button").click();

    const dialog = page.getByRole("dialog");
    await dialog.locator("#title").fill(title);

    const assigneeLabel = dialog.locator('label[for="assigned_to"]');
    if ((await assigneeLabel.count()) > 0) {
      const assignee = assigneeLabel.locator("..").getByRole("combobox");
      await assignee.click();
      await page.getByRole("option").first().click();
    }

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    created = true;

    await expect(page.getByTestId("tasks-view-section")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("tasks-list").getByText(title, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await deleteTaskFromList(page, title);
    created = false;
  } finally {
    if (created) {
      await deleteTaskFromList(page, title).catch(() => undefined);
    }
  }
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Ftasks");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}