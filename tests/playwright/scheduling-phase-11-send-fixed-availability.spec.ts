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

function isoWeekStart(date = new Date()) {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  return result.toISOString().slice(0, 10);
}

function availabilityTimestamp(weekStart: string, dayOfWeek: number, time: string) {
  const [year, month, day] = weekStart.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + dayOfWeek);
  date.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
  return date.toISOString();
}

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

test.describe('Schedule phase 11 send another fixed availability', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  const weekStart = isoWeekStart();
  const postedStart = availabilityTimestamp(weekStart, 0, '10:00');
  const postedEnd = availabilityTimestamp(weekStart, 0, '14:00');

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    const { error: prefsError } = await admin.from('org_prefs').upsert(
      {
        id: SCHEDULING_PW_TENANT.companyId,
        availability_choice: 'fixed',
      },
      { onConflict: 'id' },
    );
    if (prefsError) throw prefsError;
    await admin
      .from('availability_request')
      .delete()
      .eq('employee_id', SCHEDULING_PW_TENANT.staffId);
    await admin.from('staff_availability').delete().eq('user_id', SCHEDULING_PW_TENANT.staffId);
    const { error: requestError } = await admin.from('availability_request').insert({
      employee_id: SCHEDULING_PW_TENANT.staffId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      week_start: weekStart,
      status: 'pending',
      payload: { source: 'employee-onboarding', desiredAvailability: {} },
    });
    if (requestError) throw requestError;
    const { error: postedError } = await admin.from('staff_availability').insert({
      user_id: SCHEDULING_PW_TENANT.staffId,
      day_of_week: 0,
      start_time: postedStart,
      end_time: postedEnd,
      week_start_date: weekStart,
      is_preferred: true,
    });
    if (postedError) throw postedError;
    await login(page);
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await admin
      .from('availability_request')
      .delete()
      .eq('employee_id', SCHEDULING_PW_TENANT.staffId);
    await admin.from('staff_availability').delete().eq('user_id', SCHEDULING_PW_TENANT.staffId);
    await admin
      .from('org_prefs')
      .update({ availability_choice: null })
      .eq('id', SCHEDULING_PW_TENANT.companyId);
  });

  test('sending another fixed availability leaves the posted window unchanged', async ({
    page,
  }) => {
    await page.goto('/app/enhanced-scheduling?panel=availability');
    await expect(page.getByRole('heading', { name: 'My availability' })).toBeVisible();
    await expect(page.getByTestId('availability-weekday-rows')).toBeVisible();
    const tuesday = page.getByTestId('availability-day-tue');
    await tuesday.getByLabel('Tue from').fill('14:00');
    await tuesday.getByLabel('Tue to').fill('18:00');
    await page.getByRole('button', { name: 'Send fixed availability' }).click();
    await expect(page.getByText('Fixed availability sent')).toBeVisible();

    const { data: posted, error: postedError } = await admin
      .from('staff_availability')
      .select('day_of_week, start_time, end_time, week_start_date')
      .eq('user_id', SCHEDULING_PW_TENANT.staffId)
      .eq('week_start_date', weekStart);
    expect(postedError).toBeNull();
    expect(posted).toEqual([
      {
        day_of_week: 0,
        start_time: postedStart,
        end_time: postedEnd,
        week_start_date: weekStart,
      },
    ]);

    const { data: requests, error: requestError } = await admin
      .from('availability_request')
      .select('id, payload')
      .eq('employee_id', SCHEDULING_PW_TENANT.staffId);
    expect(requestError).toBeNull();
    expect(requests?.length).toBe(2);
    const sources = (requests ?? []).map(
      (row) => (row.payload as { source?: string } | null)?.source,
    );
    expect(sources).toContain('my-availability');
  });
});