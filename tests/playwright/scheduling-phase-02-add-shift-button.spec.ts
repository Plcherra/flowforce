import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import {
  cleanupSchedulingPlaywrightTenant,
  ensureSchedulingPlaywrightTenant,
  SCHEDULING_PW_TENANT,
} from './helpers/schedulingPlaywrightTenant';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_SUPABASE_CREDS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SHIFT_TITLE = 'Phase 2 Existing Shift';

const MENU_ITEMS = [
  'Add multiple shifts',
  'Import shifts from Excel',
  'Add unavailability',
  'Add time off',
] as const;

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

async function openSchedule(page: Page) {
  await page.goto('/app/enhanced-scheduling');
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
}

async function expectSingleAddControl(page: Page, label: string) {
  await expect(page.getByRole('button', { name: 'View options' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add shift', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add shift menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy last week' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add first shift' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add shift', exact: true }).click();
  const wizard = page.getByRole('dialog');
  await expect(wizard.getByRole('heading', { name: 'Create New Shift' })).toBeVisible();
  await expect(wizard.getByRole('menuitem', { name: 'Add single shift' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(wizard).toBeHidden();

  await page.getByRole('button', { name: 'Add shift menu' }).click();
  for (const item of MENU_ITEMS) {
    await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
  }
  await expect(page.getByRole('menuitem', { name: 'Add single shift' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Add multiple shifts' }).click();
  await expect(page.getByRole('heading', { name: 'Add Multiple Shifts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add Multiple Shifts' })).toHaveCount(0);
  await expect(page.getByTestId('add-shift-control'), label).toHaveCount(1);
}

test.describe('Schedule phase 2 one Add shift button', () => {
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
    await login(page);
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await cleanupSchedulingPlaywrightTenant(admin);
  });

  test('opens Add shift and its menu on an empty week and a week with shifts', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openSchedule(page);
    await expect(page.getByTestId('schedule-empty-banner')).toBeVisible();
    await expectSingleAddControl(page, 'empty week');

    const start = dayjs().startOf('day').add(12, 'hour');
    const { error } = await admin.from('schedules').insert({
      id: randomUUID(),
      title: SHIFT_TITLE,
      role: 'Supervisor',
      company_id: SCHEDULING_PW_TENANT.companyId,
      created_by: SCHEDULING_PW_TENANT.managerId,
      start_time: start.toISOString(),
      end_time: start.add(4, 'hour').toISOString(),
      is_published: false,
      status: 'scheduled',
    });
    if (error) throw error;

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByText(SHIFT_TITLE).first()).toBeVisible();
    await expect(page.getByTestId('schedule-empty-banner')).toHaveCount(0);
    await expectSingleAddControl(page, 'week with shifts');
  });
});
