import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import {
  ensureSchedulingPlaywrightTenant,
  SCHEDULING_PW_TENANT,
} from './helpers/schedulingPlaywrightTenant';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SeedHandles = {
  shiftId: string;
  timeOffId: string;
  eventDate: string;
};

async function createSupabaseAdmin(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function seedSchedulingFixtures(
  client: SupabaseClient,
  options?: { published?: boolean; assignToStaff?: boolean },
): Promise<SeedHandles> {
  const today = dayjs().startOf('day').add(12, 'hour');
  const shiftId = `pw-shift-${today.valueOf()}`;
  const timeOffId = `pw-timeoff-${today.valueOf()}`;
  const eventDate = today.format('YYYY-MM-DD');
  const published = options?.published ?? false;

  await client.from('schedules').upsert({
    id: shiftId,
    title: 'Playwright Smoke Shift',
    role: 'Supervisor',
    company_id: SCHEDULING_PW_TENANT.companyId,
    created_by: SCHEDULING_PW_TENANT.managerId,
    start_time: today.toISOString(),
    end_time: today.add(4, 'hour').toISOString(),
    is_published: published,
    status: 'scheduled',
  });

  if (options?.assignToStaff) {
    await client
      .from('schedule_assignments')
      .delete()
      .eq('schedule_id', shiftId)
      .eq('user_id', SCHEDULING_PW_TENANT.staffId);
    const { error: assignmentError } = await client.from('schedule_assignments').insert({
      schedule_id: shiftId,
      user_id: SCHEDULING_PW_TENANT.staffId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      status: 'assigned',
    });
    if (assignmentError) throw assignmentError;
  }

  await client.from('time_off_requests').upsert({
    id: timeOffId,
    user_id: SCHEDULING_PW_TENANT.managerId,
    company_id: SCHEDULING_PW_TENANT.companyId,
    start_date: eventDate,
    end_date: today.add(1, 'day').format('YYYY-MM-DD'),
    status: 'approved',
    type: 'vacation',
    reason: 'Playwright smoke seed',
  });

  return { shiftId, timeOffId, eventDate };
}

async function clearSchedulingFixtures(client: SupabaseClient, handles: SeedHandles) {
  await client.from('schedule_assignments').delete().eq('schedule_id', handles.shiftId);
  await client
    .from('vendor_event')
    .delete()
    .eq('company_id', SCHEDULING_PW_TENANT.companyId)
    .eq('event_date', handles.eventDate);
  await client.from('time_off_requests').delete().eq('id', handles.timeOffId);
  await client.from('schedules').delete().eq('id', handles.shiftId);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/app/dashboard', { timeout: 30_000 });
}

async function openSchedulePage(page: Page, heading: string | RegExp = 'Schedule') {
  await page.goto('/app/enhanced-scheduling');
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function toggleRoleTemplates(page: Page) {
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Toggle role templates' }).click();
  await expect(page.getByText('Role Templates')).toBeVisible();
}

const HAS_SUPABASE_CREDS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const CAN_RUN_SCHEDULING_SMOKE = SHOULD_RUN && HAS_SUPABASE_CREDS;

test.beforeAll(async () => {
  if (!HAS_SUPABASE_CREDS) return;
  const adminClient = await createSupabaseAdmin();
  await ensureSchedulingPlaywrightTenant(adminClient);
});

test.describe('Scheduling smoke (Playwright)', () => {
  test.skip(
    !CAN_RUN_SCHEDULING_SMOKE,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let adminClient: SupabaseClient | null = null;
  let seedHandles: SeedHandles | null = null;

  test.beforeAll(async () => {
    adminClient = await createSupabaseAdmin();
  });

  test.beforeEach(async ({ page }) => {
    if (!adminClient) return;
    seedHandles = await seedSchedulingFixtures(adminClient);

    await login(
      page,
      SCHEDULING_PW_TENANT.managerEmail,
      SCHEDULING_PW_TENANT.password,
    );
    await openSchedulePage(page);
  });

  test.afterEach(async ({ page }) => {
    if (seedHandles && adminClient) {
      await clearSchedulingFixtures(adminClient, seedHandles);
      seedHandles = null;
    }
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('calendar reflects seeded shift', async ({ page }) => {
    if (!seedHandles) return;
    await page.setViewportSize({ width: 1366, height: 900 });
    await expect(page.getByTestId(`schedule-shift-${seedHandles.shiftId}`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
  });

  test('mobile viewport renders manager schedule shell', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View options' })).toBeVisible();
  });

  test('time off panel opens from query param', async ({ page }) => {
    await page.goto('/app/enhanced-scheduling?panel=timeoff');
    await expect(page.getByRole('heading', { name: 'Time Off' })).toBeVisible();
  });

  test('assigning an employee via shift details shows assignment chip', async ({ page }) => {
    if (!seedHandles) return;

    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    await expect(page.getByTestId('shift-details-panel')).toBeVisible();

    await page.getByTestId('employee-selector-add').click();
    const staffOption = page.getByRole('option', { name: /Scheduling Staff/i });
    await expect(staffOption).toBeVisible();
    await staffOption.click();

    await expect(page.getByText('Employee assigned')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId(`employee-assignment-${SCHEDULING_PW_TENANT.staffId}`),
    ).toBeVisible();
  });

  test('linking vendor visit to shift surfaces vendor chip', async ({ page }) => {
    if (!seedHandles) return;

    await toggleRoleTemplates(page);

    await page.getByTestId('vendor-palette-vendor-inspection').dragTo(
      page.getByTestId(`schedule-unassigned-day-${seedHandles.eventDate}`),
    );

    await expect(page.getByTestId('vendor-event-dialog')).toBeVisible();

    await page.getByTestId('vendor-event-shift-select').click();
    await page.getByRole('option', { name: /Playwright Smoke Shift/i }).click();
    await page.getByTestId('vendor-event-save').click();

    await expect(page.getByTestId('vendor-event-dialog')).toBeHidden({ timeout: 15_000 });
    await expect(
      page
        .getByTestId(`schedule-shift-${seedHandles.shiftId}`)
        .getByText('Vendor · Health Inspection'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('staff view shows My Schedule without manager publish actions', async ({ page }) => {
    if (!adminClient) return;

    const staffSeed = await seedSchedulingFixtures(adminClient, {
      published: true,
      assignToStaff: true,
    });

    await page.context().clearCookies();
    await login(page, SCHEDULING_PW_TENANT.staffEmail, SCHEDULING_PW_TENANT.password);
    await openSchedulePage(page, 'My Schedule');

    await expect(page.getByRole('button', { name: 'Actions' })).toHaveCount(0);
    await expect(page.getByText('Smart Fill')).toHaveCount(0);
    await expect(page.getByTestId(`schedule-shift-${staffSeed.shiftId}`)).toBeVisible();

    await clearSchedulingFixtures(adminClient, staffSeed);
  });
});

test.describe('Scheduling legacy redirects', () => {
  const email =
    process.env.E2E_EMAIL ??
    (HAS_SUPABASE_CREDS ? SCHEDULING_PW_TENANT.managerEmail : undefined);
  const password =
    process.env.E2E_PASSWORD ??
    (HAS_SUPABASE_CREDS ? SCHEDULING_PW_TENANT.password : undefined);

  test.skip(!email || !password, 'Set E2E_EMAIL/E2E_PASSWORD or run with local Supabase.');

  test.beforeEach(async ({ page }) => {
    await login(page, email!, password!);
  });

  test('redirects /app/time-off to schedule timeoff panel', async ({ page }) => {
    await page.goto('/app/time-off');
    await page.waitForURL('**/app/enhanced-scheduling?panel=timeoff**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Time Off' })).toBeVisible();
  });

  test('redirects /app/availability to schedule availability panel', async ({ page }) => {
    await page.goto('/app/availability');
    await page.waitForURL('**/app/enhanced-scheduling?panel=availability**', {
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: /Availability/i })).toBeVisible();
  });

  test('redirects /schedule-lobby to enhanced scheduling', async ({ page }) => {
    await page.goto('/schedule-lobby');
    await page.waitForURL('**/app/enhanced-scheduling**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
  });
});
