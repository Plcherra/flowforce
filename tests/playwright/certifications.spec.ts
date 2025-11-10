import { expect, test, type Page } from '@playwright/test';
import { mockCertificationsApi, seedSupabaseSession, type CertificationScenario } from './utils/certificationsMocks';

async function setupScenario(page: Page, scenario: CertificationScenario) {
  await seedSupabaseSession(page);
  await mockCertificationsApi(page, scenario);
}

test.describe('Certifications page', () => {
  test('shows metrics and earned badge when data loads', async ({ page }) => {
    await setupScenario(page, 'load');
    await page.goto('/app/certifications');

    await expect(page.getByRole('heading', { name: 'Certifications & Badges' })).toBeVisible();

    const tasksMetric = page.getByTestId('certifications-metric-tasks');
    await expect(tasksMetric.getByText('Completed tasks')).toBeVisible();
    await expect(tasksMetric.locator('.text-2xl')).toHaveText('4');

    const firstCard = page.getByTestId('certifications-card-CX-101');
    await expect(firstCard.getByText('Customer Excellence Mastery')).toBeVisible();
    await expect(firstCard.getByText('Earned')).toBeVisible();
  });

  test('renders empty state and stays stable on refresh', async ({ page }) => {
    await setupScenario(page, 'empty');
    await page.goto('/app/certifications');

    const emptyState = page.getByText('No certifications available yet');
    await expect(emptyState).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(emptyState).toBeVisible();
  });

  test('shows fallback error banner when Supabase fails', async ({ page }) => {
    await setupScenario(page, 'error');
    await page.goto('/app/certifications');

    await expect(
      page.getByText("We couldn't load certifications right now. Please try again."),
    ).toBeVisible();

    await expect(page.getByTestId('certifications-metric-tasks')).toHaveCount(0);
    await expect(page.getByText('No certifications available yet')).toBeVisible();
  });

  test('navigates to learning center when starting a certification', async ({ page }) => {
    await setupScenario(page, 'cta');
    await page.goto('/app/certifications');

    const startButton = page.getByRole('button', { name: /Start Certification/i }).first();
    await startButton.click();

    await page.waitForURL('**/app/learning-center**');
    await expect(page).toHaveURL(/\/app\/learning-center\?tab=catalog&certification=OPS-101/);
  });
});
