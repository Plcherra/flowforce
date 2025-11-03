import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('System settings workflow', () => {
  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD must be set for settings tests');

  test('allows updating general settings and navigating tabs', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/app/dashboard**', { timeout: 30_000 });

    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: /System Settings/i })).toBeVisible({ timeout: 30_000 });

    const tabAssertions: Array<{ label: string; locator: RegExp }> = [
      { label: 'Security', locator: /Security & Access Controls/i },
      { label: 'Localization', locator: /Localization/i },
      { label: 'Notifications', locator: /Notification Center/i },
      { label: 'AI Co-Pilot', locator: /AI Co-Pilot/i },
      { label: 'Integrations', locator: /Integrations/i },
      { label: 'Admin', locator: /Tenant management/i },
    ];

    for (const { label, locator } of tabAssertions) {
      await page.getByRole('tab', { name: label }).click();
      await expect(page.getByText(locator)).toBeVisible({ timeout: 30_000 });
    }

    // Return to General tab to update a field
    await page.getByRole('tab', { name: 'General' }).click();
    const descriptionEditor = page.getByLabel('Company Description');
    const originalDescription = await descriptionEditor.inputValue();
    const newDescription = `QA checkpoint ${Date.now()}`;

    await descriptionEditor.fill(newDescription);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/General settings saved/i)).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByLabel('Company Description')).toHaveValue(newDescription, { timeout: 30_000 });

    // Revert to original content to keep environment stable
    await page.getByLabel('Company Description').fill(originalDescription);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/General settings saved/i)).toBeVisible({ timeout: 30_000 });
  });

  test('surfaces actionable error when company context is missing', async ({ page }) => {
    await page.route('**/rest/v1/profiles**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'mock-user', company_id: null, is_company_admin: true }]),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/auth');

    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/app/dashboard**', { timeout: 30_000 });

    await page.goto('/app/settings');
    await expect(page.getByText(/No company detected/i)).toBeVisible({ timeout: 30_000 });

    await page.unroute('**/rest/v1/profiles**');
  });
});
