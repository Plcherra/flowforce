import { randomUUID } from 'node:crypto';
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
const STAFF_TITLE = 'Playwright staff checklist';
const MANAGER_TITLE = 'Playwright manager checklist';

function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function login(page: Page, email: string) {
  await page.goto('/auth');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await page.goto('/auth');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(async () => {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(SCHEDULING_PW_TENANT.password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

function reminderRow(title: string, userId: string, id: string) {
  return {
    id,
    user_id: userId,
    company_id: SCHEDULING_PW_TENANT.companyId,
    title,
    description: title,
    type: 'schedule.assignment',
    remind_at: new Date().toISOString(),
    repeat_interval: 'weekly',
    repeat_enabled: true,
    completed: false,
    allow_deactivate: false,
    priority: 'normal',
    notification_methods: ['in_app'],
  };
}

test.describe('Schedule phase 21 deactivate follows allow_deactivate', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let staffReminderId = '';
  let managerReminderId = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    staffReminderId = randomUUID();
    managerReminderId = randomUUID();
    await admin.from('org_prefs').upsert(
      { id: SCHEDULING_PW_TENANT.companyId, availability_choice: null },
      { onConflict: 'id' },
    );
    const { error } = await admin.from('reminders').insert([
      reminderRow(STAFF_TITLE, SCHEDULING_PW_TENANT.staffId, staffReminderId),
      reminderRow(MANAGER_TITLE, SCHEDULING_PW_TENANT.managerId, managerReminderId),
    ]);
    if (error) throw error;
    await login(page, SCHEDULING_PW_TENANT.staffEmail);
  });

  test.afterEach(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    const ids = [staffReminderId, managerReminderId].filter(Boolean);
    if (ids.length) await admin.from('reminders').delete().in('id', ids);
  });

  test('the assignee can deactivate only when the flag is on, and only that reminder hides', async ({
    page,
  }) => {
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    const staffRow = page.getByTestId('assigned-reminder').filter({ hasText: STAFF_TITLE });
    await expect(staffRow).toBeVisible();
    await expect(page.getByTestId('deactivate-reminder')).toHaveCount(0);
    await expect(page.getByText(MANAGER_TITLE)).toHaveCount(0);

    await login(page, SCHEDULING_PW_TENANT.managerEmail);
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    const managerViewOfStaff = page
      .getByTestId('assigned-reminder')
      .filter({ hasText: STAFF_TITLE });
    await expect(managerViewOfStaff).toBeVisible();
    await managerViewOfStaff.getByTestId('allow-deactivate-reminder').click();
    await expect(page.getByText('Deactivate allowed')).toBeVisible();

    await login(page, SCHEDULING_PW_TENANT.staffEmail);
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    const assigneeRow = page.getByTestId('assigned-reminder').filter({ hasText: STAFF_TITLE });
    await expect(assigneeRow.getByTestId('deactivate-reminder')).toBeVisible();
    await assigneeRow.getByTestId('deactivate-reminder').click();
    await expect(page.getByText('Reminder turned off')).toBeVisible();
    await expect(page.getByTestId('assigned-reminder').filter({ hasText: STAFF_TITLE })).toHaveCount(0);

    await login(page, SCHEDULING_PW_TENANT.managerEmail);
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    await expect(page.getByTestId('assigned-reminder').filter({ hasText: STAFF_TITLE })).toBeVisible();
    await expect(page.getByTestId('assigned-reminder').filter({ hasText: MANAGER_TITLE })).toBeVisible();
  });
});
