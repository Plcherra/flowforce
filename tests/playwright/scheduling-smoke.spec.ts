import { expect, test } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_COMPANY_ID = process.env.PLAYWRIGHT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001';
const TEST_MANAGER_EMAIL = process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'manager@example.com';
const TEST_MANAGER_PASSWORD = process.env.PLAYWRIGHT_MANAGER_PASSWORD ?? 'Password123!';

type SeedHandles = {
  shiftId: string;
  vendorEventId: string;
  timeOffId: string;
};

async function createSupabaseAdmin(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function seedSchedulingFixtures(client: SupabaseClient): Promise<SeedHandles> {
  const today = dayjs().startOf('day').add(12, 'hour');
  const shiftId = `pw-shift-${today.valueOf()}`;
  const vendorEventId = `pw-vendor-${today.valueOf()}`;
  const timeOffId = `pw-timeoff-${today.valueOf()}`;

  await client.from('schedules').upsert({
    id: shiftId,
    title: 'Playwright Smoke Shift',
    role: 'Supervisor',
    company_id: TEST_COMPANY_ID,
    created_by: TEST_MANAGER_EMAIL,
    start_time: today.toISOString(),
    end_time: today.add(4, 'hour').toISOString(),
    is_published: true,
    status: 'scheduled',
  });

  await client.from('vendor_event').upsert({
    id: vendorEventId,
    title: 'Playwright Vendor Visit',
    company_id: TEST_COMPANY_ID,
    vendor_type: 'inspection',
    event_date: today.format('YYYY-MM-DD'),
    start_time: '12:00',
    end_time: '14:00',
    notes: 'Seeded via Playwright smoke test',
  });

  await client.from('time_off_requests').upsert({
    id: timeOffId,
    user_id: TEST_MANAGER_EMAIL,
    company_id: TEST_COMPANY_ID,
    start_date: today.format('YYYY-MM-DD'),
    end_date: today.add(1, 'day').format('YYYY-MM-DD'),
    status: 'approved',
    type: 'vacation',
    reason: 'Playwright smoke seed',
  });

  return { shiftId, vendorEventId, timeOffId };
}

async function clearSchedulingFixtures(client: SupabaseClient, handles: SeedHandles) {
  await client.from('schedule_assignments').delete().eq('schedule_id', handles.shiftId);
  await client.from('vendor_event').delete().eq('id', handles.vendorEventId);
  await client.from('time_off_requests').delete().eq('id', handles.timeOffId);
  await client.from('schedules').delete().eq('id', handles.shiftId);
}

const HAS_SUPABASE_CREDS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

test.describe('Scheduling smoke (Playwright)', () => {
  test.skip(!SHOULD_RUN || !HAS_SUPABASE_CREDS, 'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase + manager credentials.');

  let adminClient: SupabaseClient | null = null;
  let seedHandles: SeedHandles | null = null;

  test.beforeAll(async () => {
    adminClient = await createSupabaseAdmin();
  });

  test.beforeEach(async ({ page }) => {
    if (!adminClient) return;
    seedHandles = await seedSchedulingFixtures(adminClient);

    await page.goto('/auth');
    await page.getByLabel('Email').fill(TEST_MANAGER_EMAIL);
    await page.getByLabel('Password').fill(TEST_MANAGER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/app/dashboard', { timeout: 30_000 });
    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByText('Next-Gen Scheduling System')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    if (seedHandles && adminClient) {
      await clearSchedulingFixtures(adminClient, seedHandles);
      seedHandles = null;
    }
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('calendar reflects seeded counts', async ({ page }) => {
    await expect(page.getByText('"Playwright Smoke Shift"').first()).toBeVisible();
    const debugLocator = page.getByTestId('scheduling-debug-json');
    await expect(debugLocator).toContainText('"counts"');
    await expect(debugLocator).toContainText('"shifts"');
    await expect(debugLocator).toContainText('"vendorEvents"');
  });

  test('dragging staff onto shift shows assignment chip', async ({ page: _page }) => {
    test.fixme(true, 'Requires draggable staff list hook-up for deterministic assignment interaction.');
  });

  test('linking vendor event to supervisor shift surfaces chip', async ({ page: _page }) => {
    test.fixme(true, 'Requires deterministic vendor dialog selectors; pending UI data-test hooks.');
  });
});
