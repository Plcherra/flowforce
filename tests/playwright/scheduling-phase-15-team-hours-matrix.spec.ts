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

test.describe('Schedule phase 15 team hours permission matrix', () => {
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
    const { error } = await admin.from('user_permissions').upsert(
      {
        user_id: SCHEDULING_PW_TENANT.staffId,
        permission_key: 'editSchedules',
        permission_value: 'allow',
      },
      { onConflict: 'user_id,permission_key' },
    );
    if (error) throw error;
    await login(page);
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await admin
      .from('user_permissions')
      .delete()
      .eq('user_id', SCHEDULING_PW_TENANT.staffId)
      .eq('permission_key', 'editSchedules');
  });

  test('turning draft permission off stays off after reload', async ({ page }) => {
    await page.goto('/app/enhanced-scheduling?panel=availability&availability=team');
    const checkbox = page.getByTestId(
      `schedule-permission-${SCHEDULING_PW_TENANT.staffId}-editSchedules`,
    );
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toHaveAttribute('data-state', 'checked');
    await checkbox.click();
    await expect(page.getByText('Schedule permission saved')).toBeVisible();
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    await page.reload();
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    const { data, error } = await admin
      .from('user_permissions')
      .select('permission_value')
      .eq('user_id', SCHEDULING_PW_TENANT.staffId)
      .eq('permission_key', 'editSchedules')
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.permission_value).toBe('deny');
  });
});