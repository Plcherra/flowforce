import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ensureSchedulingPlaywrightTenant,
  SCHEDULING_PW_TENANT,
} from './helpers/schedulingPlaywrightTenant';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_SUPABASE_CREDS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function login(page: Page) {
  await page.goto('/auth');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await page.goto('/auth');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(async () => {
    await page.getByLabel('Email').fill(SCHEDULING_PW_TENANT.managerEmail);
    await page.getByLabel('Password').fill(SCHEDULING_PW_TENANT.password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

test.describe('Schedule phase 8 availability choice editor', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await ensureSchedulingPlaywrightTenant(createSupabaseAdmin());
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await login(page);
  });

  test('a manager sets fixed and the three weekdays and sees them after reload', async ({
    page,
  }) => {
    await page.goto('/app/enhanced-scheduling?panel=availability&availability=team');
    await expect(page.getByRole('heading', { name: 'Team availability' })).toBeVisible();

    const choice = page.getByTestId('availability-choice');
    await expect(choice).toBeVisible();
    const optionLabels = (await choice.locator('option').allTextContents()).map((label) =>
      label.trim().toLowerCase(),
    );
    expect(optionLabels).toEqual(['select', 'open', 'fixed']);
    expect(optionLabels).not.toContain('flexible');

    await choice.selectOption('fixed');
    await page.getByTestId('schedule-window-start').selectOption('1');
    await page.getByTestId('schedule-window-end').selectOption('5');
    await page.getByTestId('schedule-posting-weekday').selectOption('3');
    await page.getByRole('button', { name: 'Save availability choice' }).click();
    await expect(page.getByText('Availability choice saved')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Team availability' })).toBeVisible();
    await expect(page.getByTestId('availability-choice')).toHaveValue('fixed');
    await expect(page.getByTestId('schedule-window-start')).toHaveValue('1');
    await expect(page.getByTestId('schedule-window-end')).toHaveValue('5');
    await expect(page.getByTestId('schedule-posting-weekday')).toHaveValue('3');
  });
});
