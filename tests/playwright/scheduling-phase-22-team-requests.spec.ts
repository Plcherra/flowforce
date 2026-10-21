import { randomUUID } from 'node:crypto';
import { format } from 'date-fns';
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
const SHIFT_TITLE = 'Playwright Kept Shift';

function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function dateInCurrentWeek(now = new Date()): Date {
  const target = new Date(now);
  target.setHours(12, 0, 0, 0);
  if (now.getDay() === 6) return target;
  target.setDate(target.getDate() + 1);
  return target;
}

function isoDate(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
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

test.describe('Schedule phase 22 team requests on the list and the grid', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let requestId = '';
  let shiftId = '';
  let requestedDay = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    requestId = randomUUID();
    shiftId = randomUUID();
    const day = dateInCurrentWeek();
    requestedDay = isoDate(day);
    const shiftStart = new Date(day);
    shiftStart.setHours(16, 0, 0, 0);
    const shiftEnd = new Date(shiftStart.getTime() + 4 * 60 * 60 * 1000);
    await admin.from('org_prefs').upsert(
      { id: SCHEDULING_PW_TENANT.companyId, availability_choice: null },
      { onConflict: 'id' },
    );
    const { error: requestError } = await admin.from('time_off_requests').insert({
      id: requestId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      user_id: SCHEDULING_PW_TENANT.staffId,
      start_date: requestedDay,
      end_date: requestedDay,
      status: 'requested',
      type: 'vacation',
      reason: 'Playwright time off',
    });
    if (requestError) throw requestError;
    const { error: shiftError } = await admin.from('schedules').insert({
      id: shiftId,
      title: SHIFT_TITLE,
      role: 'Barista',
      company_id: SCHEDULING_PW_TENANT.companyId,
      created_by: SCHEDULING_PW_TENANT.managerId,
      start_time: shiftStart.toISOString(),
      end_time: shiftEnd.toISOString(),
      is_published: true,
      status: 'scheduled',
    });
    if (shiftError) throw shiftError;
    const { error: assignmentError } = await admin.from('schedule_assignments').insert({
      schedule_id: shiftId,
      user_id: SCHEDULING_PW_TENANT.staffId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      status: 'assigned',
    });
    if (assignmentError) throw assignmentError;
    await login(page, SCHEDULING_PW_TENANT.managerEmail);
  });

  test.afterEach(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    if (requestId) await admin.from('time_off_requests').delete().eq('id', requestId);
    if (shiftId) {
      await admin.from('schedule_assignments').delete().eq('schedule_id', shiftId);
      await admin.from('schedules').delete().eq('id', shiftId);
    }
  });

  test('a pending request shows its detail, appears as requested off, and cannot be approved without permission', async ({
    page,
  }) => {
    const when = format(
      new Date(
        Number(requestedDay.slice(0, 4)),
        Number(requestedDay.slice(5, 7)) - 1,
        Number(requestedDay.slice(8, 10)),
      ),
      'MMM d, yyyy',
    );
    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByTestId('schedule-week-grid')).toBeVisible();
    await expect(page.getByText(SHIFT_TITLE).first()).toBeVisible();
    await expect(page.getByTestId('schedule-requested-off').first()).toBeVisible();

    await page.goto('/app/enhanced-scheduling?panel=staff');
    await expect(page.getByTestId('team-requests')).toBeVisible();
    await page.getByRole('tab', { name: 'Time Off' }).click();
    const row = page.getByTestId('time-off-request').filter({ hasText: 'Scheduling Staff' });
    await expect(row.getByTestId('time-off-status')).toHaveText('pending');
    await expect(row.getByTestId('time-off-start')).toHaveText(when);
    await expect(row.getByTestId('time-off-end')).toHaveText(when);
    await expect(row.getByTestId('time-off-time-left')).toContainText('Time left');

    await login(page, SCHEDULING_PW_TENANT.staffEmail);
    await page.goto('/app/enhanced-scheduling?panel=staff');
    const sheet = page.getByTestId('scheduling-panel-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  });
});
