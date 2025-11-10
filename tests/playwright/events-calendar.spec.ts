import { expect, test } from '@playwright/test';

test.describe('Events Calendar Page', () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD must be set for calendar tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/app/dashboard**', { timeout: 30_000 });
  });

  test('loads the calendar page shell', async ({ page }) => {
    await page.goto('/app/events/calendar');
    await expect(page.getByRole('heading', { name: 'Events & Meetings' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /search events/i })).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });

  test('opens the create event dialog from quick actions', async ({ page }) => {
    await page.goto('/app/events/calendar');
    await page.getByRole('button', { name: 'Create event' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test('shows dropdown scheduling options', async ({ page }) => {
    await page.goto('/app/events/calendar');
    await page.getByRole('button', { name: 'Schedule' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /vendor visit/i })).toBeVisible();
  });
});
