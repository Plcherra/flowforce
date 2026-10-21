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
const SHIFT_TITLE = 'Playwright Linked Shift';

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

test.describe('Schedule phase 19 open the record a reminder points at', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let shiftId = '';
  let reminderId = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    shiftId = randomUUID();
    reminderId = randomUUID();
    const start = new Date();
    start.setUTCHours(16, 0, 0, 0);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    await admin.from('org_prefs').upsert(
      { id: SCHEDULING_PW_TENANT.companyId, availability_choice: null },
      { onConflict: 'id' },
    );
    const { error: shiftError } = await admin.from('schedules').insert({
      id: shiftId,
      title: SHIFT_TITLE,
      role: 'Barista',
      company_id: SCHEDULING_PW_TENANT.companyId,
      created_by: SCHEDULING_PW_TENANT.managerId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
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
    const { error: reminderError } = await admin.from('reminders').insert({
      id: reminderId,
      user_id: SCHEDULING_PW_TENANT.staffId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      title: 'Open your shift',
      description: SHIFT_TITLE,
      type: `record.shift:${shiftId}`,
      remind_at: new Date().toISOString(),
      completed: false,
      allow_deactivate: false,
      priority: 'normal',
      repeat_enabled: false,
      notification_methods: ['in_app'],
    });
    if (reminderError) throw reminderError;
    await login(page);
  });

  test.afterEach(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    if (reminderId) await admin.from('reminders').delete().eq('id', reminderId);
    if (shiftId) {
      await admin.from('schedule_assignments').delete().eq('schedule_id', shiftId);
      await admin.from('schedules').delete().eq('id', shiftId);
    }
  });

  test('the staff user opens the shift from the reminder', async ({ page }) => {
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
    const opener = page.getByTestId('open-linked-reminder');
    await expect(opener).toBeVisible();
    await expect(opener).toContainText(SHIFT_TITLE);
    await opener.click();
    await expect(page).toHaveURL(new RegExp(`shift=${shiftId}`));
    const shiftDetails = page.getByTestId('shift-details-panel');
    await expect(shiftDetails).toBeVisible();
    await expect(shiftDetails.getByLabel('Title')).toHaveValue(SHIFT_TITLE);
  });
});