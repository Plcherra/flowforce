import { expect, test, type Page } from '@playwright/test';
import { missingE2eEnv } from './required-env';

/**
 * Locale is pinned to English before the app boots (browser locale plus
 * i18next's localStorage key). After sign-in the profile language can
 * replace that, so actions on the tasks page use roles, labels wired to
 * stable ids, and existing test ids instead of translated button text.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. See e2e/README.md.`,
    );
  }
});

test('signs in, creates a task, and sees it in the list', async ({ page }) => {
  const title = `e2e-task-${Date.now()}`;
  let created = false;

  try {
    await signIn(page);
    await createTask(page, title);
    created = true;
    await expectTaskInList(page, title);
    await deleteTaskFromList(page, title);
    created = false;
  } finally {
    if (created) {
      await deleteTaskFromList(page, title).catch((error: unknown) => {
        console.error('Could not delete the e2e task', error);
      });
    }
  }
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';

  await page.goto('/auth?redirectTo=%2Fapp%2Ftasks');
  await expect(page.getByLabel('Email')).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await page.goto('/app/tasks');
  await expect(page.getByTestId('tasks-page')).toBeVisible();
}

async function createTask(page: Page, title: string) {
  await page.getByTestId('tasks-create-button').click();
  await page.getByTestId('tasks-create-menu').getByRole('button').click();

  const dialog = page.getByRole('dialog');
  const titleInput = dialog.locator('#title');
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);

  const submit = dialog.locator('button[type="submit"]');
  await expect(submit).toBeEnabled();

  const assigneeLabel = dialog.locator('label[for="assigned_to"]');
  if ((await assigneeLabel.count()) > 0) {
    const assignee = assigneeLabel.locator('..').getByRole('combobox');
    await expect(assignee).toBeEnabled();
    await assignee.click();
    const option = page.getByRole('option').first();
    await expect(option).toBeVisible();
    await option.click();
  }

  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}

async function expectTaskInList(page: Page, title: string) {
  await page.getByTestId('tasks-mode-all').click();
  await page.locator('#tasks-search').fill(title);
  await expect(page.getByTestId('tasks-list').getByText(title, { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

async function deleteTaskFromList(page: Page, title: string) {
  if (!page.url().includes('/app/tasks')) {
    await page.goto('/app/tasks');
  }
  await expect(page.getByTestId('tasks-page')).toBeVisible();
  await page.getByTestId('tasks-mode-all').click();
  await page.locator('#tasks-search').fill(title);

  const card = page.getByTestId('tasks-list').getByRole('button', { name: title });
  const visible = await card
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;

  // The details dialog is lazy-loaded. The first click in dev can spend the
  // default expect timeout compiling that chunk, so retry the open.
  const dialog = page.getByRole('dialog');
  let opened = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await card.click();
    opened = await dialog
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
  }
  if (!opened) {
    throw new Error('Task details dialog did not open');
  }

  const deleteButton = dialog.locator('button.text-destructive');
  if ((await deleteButton.count()) === 0) {
    await page.keyboard.press('Escape');
    return;
  }

  page.once('dialog', (confirm) => {
    void confirm.accept();
  });
  await deleteButton.click();
  await expect(card).toHaveCount(0, { timeout: 20_000 });
}
