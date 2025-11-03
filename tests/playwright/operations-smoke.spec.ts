import { expect, test } from '@playwright/test';

test.describe('Operations smoke navigation', () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD must be set for smoke tests');

  test('loads dashboard and navigates operations pages without errors', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/app/dashboard**', { timeout: 30_000 });
    await expect(page.locator('text=Something went wrong')).toHaveCount(0);

    const routes: Array<{ link: string; assert: () => Promise<void> }> = [
      {
        link: 'Goals',
        assert: () => expect(page.getByRole('heading', { name: /Goals & Objectives/i })).toBeVisible({ timeout: 30_000 }),
      },
      {
        link: 'Tasks',
        assert: () => expect(page.getByRole('heading', { name: /^Tasks$/i })).toBeVisible({ timeout: 30_000 }),
      },
      {
        link: 'Forms',
        assert: () => expect(page.getByRole('heading', { name: /^Forms$/i })).toBeVisible({ timeout: 30_000 }),
      },
      {
        link: 'Scheduling',
        assert: () => expect(page.locator('text=Weekly Hour Summary')).toBeVisible({ timeout: 30_000 }),
      },
      {
        link: 'My Availability',
        assert: () => expect(page.getByRole('heading', { name: /My Availability/i })).toBeVisible({ timeout: 30_000 }),
      },
    ];

    for (const { link, assert } of routes) {
      await page.getByRole('link', { name: link }).click();
      await assert();
      await expect(page.locator('text=Something went wrong')).toHaveCount(0);
    }
  });
});
