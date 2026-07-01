import { expect, test } from '@playwright/test';

test.describe('Calendar Page', () => {
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
    await page.goto('/app/calendar');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
    await expect(
      page.getByPlaceholder('Search upcoming events'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /add to calendar/i })).toBeVisible();
  });

  test('opens the create dialog from the primary action', async ({ page }) => {
    await page.goto('/app/calendar');
    await page.getByRole('button', { name: /add to calendar/i }).click();
    await expect(page.getByRole('dialog', { name: /add to calendar/i })).toBeVisible();
    await expect(page.getByLabel('Type')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test('redirects legacy events calendar route', async ({ page }) => {
    await page.goto('/app/events/calendar');
    await page.waitForURL('**/app/calendar**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  });
});
