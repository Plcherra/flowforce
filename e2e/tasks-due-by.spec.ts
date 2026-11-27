import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

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

test("creates a task with a due-by time and shows it on the card", async ({
  page,
}) => {
  const title = `e2e-due-by-${Date.now()}`;
  let created = false;

  try {
    await signIn(page);
    await openCreateDialog(page, title);
    await page.getByTestId("create-task-due-by-toggle").click();
    const date = "2026-12-15";
    await page.getByTestId("create-task-due-by-date").fill(date);
    await page.getByTestId("create-task-due-by-time").fill("14:30");
    await submitCreateDialog(page);
    created = true;

    await page.getByTestId("tasks-mode-all").click();
    await page.locator("#tasks-search").fill(title);
    const card = page
      .getByTestId("tasks-list")
      .getByRole("button", { name: title });
    await expect(card).toBeVisible({ timeout: 20_000 });
    const dueLabel = card.getByTestId("task-due-label");
    await expect(dueLabel).toBeVisible();
    await expect(dueLabel).toContainText("2:30");
    await expect(dueLabel).toContainText("Dec");
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
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible();
}

async function openCreateDialog(page: Page, title: string) {
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
  return dialog;
}

async function submitCreateDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  const submit = dialog.locator('button[type="submit"]');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}

async function deleteTaskFromList(page: Page, title: string) {
  await page.goto("/app/tasks");
  await page.getByTestId("tasks-mode-all").click();
  await page.locator("#tasks-search").fill(title);
  const card = page
    .getByTestId("tasks-list")
    .getByRole("button", { name: title });
  if (!(await card.isVisible().catch(() => false))) return;
  await card.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /delete/i }).click();
  const confirm = page.getByRole("alertdialog");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.getByRole("button", { name: /delete/i }).click();
  }
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}