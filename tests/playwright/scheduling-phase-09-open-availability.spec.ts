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
    await page.getByLabel('Email').fill(SCHEDULING_PW_TENANT.staffEmail);
    await page.getByLabel('Password').fill(SCHEDULING_PW_TENANT.password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

test.describe('Schedule phase 9 open availability', () => {
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
    const { error } = await admin.from('org_prefs').upsert(
      {
        id: SCHEDULING_PW_TENANT.companyId,
        availability_choice: 'open',
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    await login(page);
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await admin
      .from('org_prefs')
      .update({ availability_choice: null })
      .eq('id', SCHEDULING_PW_TENANT.companyId);
  });

  test('open availability does not require the weekday grid', async ({ page }) => {
    await page.goto('/app/enhanced-scheduling?panel=availability');
    await expect(page.getByRole('heading', { name: 'My availability' })).toBeVisible();
    await expect(page.getByTestId('availability-open-notice')).toBeVisible();
    await expect(page.getByText('Any day, any time')).toBeVisible();
    await expect(page.getByTestId('availability-weekday-rows')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'All day on' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  });
});
