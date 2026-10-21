import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  cleanupSchedulingPlaywrightTenant,
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
    await page.getByLabel('Email').fill(SCHEDULING_PW_TENANT.staffEmail);
    await page.getByLabel('Password').fill(SCHEDULING_PW_TENANT.password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

test.describe('Schedule phase 6 weekday availability rows', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await cleanupSchedulingPlaywrightTenant(admin);
    await admin
      .from('staff_availability')
      .delete()
      .eq('user_id', SCHEDULING_PW_TENANT.staffId);
    await login(page);
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await admin
      .from('staff_availability')
      .delete()
      .eq('user_id', SCHEDULING_PW_TENANT.staffId);
    await cleanupSchedulingPlaywrightTenant(admin);
  });

  test('saves Monday all day and Tuesday off, then shows the same rows after reload', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/app/enhanced-scheduling?panel=availability');
    await expect(page.getByTestId('availability-weekday-rows')).toBeVisible();

    const monday = page.getByTestId('availability-day-mon');
    const tuesday = page.getByTestId('availability-day-tue');
    await monday.getByRole('button', { name: 'All day on' }).click();
    await tuesday.getByLabel('Tue from').fill('14:00');
    await tuesday.getByLabel('Tue to').fill('18:00');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Availability saved')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('availability-weekday-rows')).toBeVisible();
    await expect(monday.getByRole('button', { name: 'All day on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(tuesday.getByRole('button', { name: 'Off' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(tuesday.getByLabel('Tue from')).toHaveValue('14:00');
    await expect(tuesday.getByLabel('Tue to')).toHaveValue('18:00');
  });
});