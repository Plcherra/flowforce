import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const nowIso = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
const laterIso = new Date(Date.now() + 65 * 60 * 1000).toISOString().slice(0, 16);

const eventTitle = `Playwright event ${Date.now()}`;
const visitTitle = `Playwright vendor ${Date.now()}`;

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/app/dashboard**', { timeout: 30_000 });
}

test.describe('Calendar CRUD flow', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD for calendar smoke tests');

  test('create and edit an event + vendor visit', async ({ page }) => {
    await signIn(page);

    await page.goto('/app/events/calendar');
    await expect(page.getByRole('heading', { name: 'Events & Meetings' })).toBeVisible();

    await page.getByRole('button', { name: 'New Event' }).click();
    const dialog = page.getByRole('dialog', { name: /create event/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Title').fill(eventTitle);
    await dialog.getByLabel('Start').fill(nowIso);
    await dialog.getByLabel('End').fill(laterIso);
    await dialog.getByLabel('Location').fill('Playwright HQ');
    await dialog.getByRole('button', { name: /create event/i }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Vendor Visit' }).click();
    const visitDialog = page.getByRole('dialog', { name: /vendor visit/i });
    await visitDialog.getByLabel('Title').fill(visitTitle);
    await visitDialog.getByLabel('Vendor Name').fill('Playwright Vendor');
    await visitDialog.getByLabel('Start').fill(nowIso);
    await visitDialog.getByLabel('End').fill(laterIso);
    await visitDialog.getByRole('button', { name: /create visit/i }).click();
    await expect(visitDialog).toBeHidden({ timeout: 30_000 });

    await expect(page.getByText(visitTitle)).toBeVisible({ timeout: 30_000 });
  });
});
