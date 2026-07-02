import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import {
  ensureSchedulingPlaywrightTenant,
  SCHEDULING_PW_TENANT,
} from './helpers/schedulingPlaywrightTenant';
import { dragDndKit } from './helpers/dndKitDrag';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SeedHandles = {
  shiftId: string;
  timeOffId: string;
  eventDate: string;
  availabilityId?: string;
  pendingTimeOffId?: string;
  approvedStaffPtoId?: string;
  weekTemplateId?: string;
  virtualEmployeeIds?: string[];
};

function isoWeekStart(date: dayjs.Dayjs) {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, 'day').format('YYYY-MM-DD');
}

function dayOfWeekIndex(date: dayjs.Dayjs) {
  const day = date.day();
  return day === 0 ? 6 : day - 1;
}

async function seedStaffPartialAvailability(
  client: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const today = dayjs().startOf('day');
  const availabilityId = `pw-avail-${today.valueOf()}`;
  const weekStart = isoWeekStart(today);

  await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(today),
    start_time: '06:00',
    end_time: '13:30',
    week_start_date: weekStart,
    is_preferred: true,
  });

  return { availabilityId, weekStart, dayIso: today.format('YYYY-MM-DD') };
}

async function seedStaffFullDayAvailability(
  client: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const today = dayjs().startOf('day');
  const availabilityId = `pw-avail-full-${today.valueOf()}`;
  const weekStart = isoWeekStart(today);

  await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(today),
    start_time: '06:00',
    end_time: '21:00',
    week_start_date: weekStart,
    is_preferred: true,
  });

  return { availabilityId, weekStart, dayIso: today.format('YYYY-MM-DD') };
}

async function seedStaffAvailabilityForDay(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  day: dayjs.Dayjs,
  suffix: string,
) {
  const availabilityId = `pw-avail-${suffix}-${day.valueOf()}`;
  const weekStart = isoWeekStart(day);

  await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(day),
    start_time: '06:00',
    end_time: '21:00',
    week_start_date: weekStart,
    is_preferred: true,
  });

  return { availabilityId, dayIso: day.format('YYYY-MM-DD') };
}

async function seedStaffPendingPto(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  eventDate: string,
) {
  const pendingTimeOffId = `pw-pending-pto-${Date.now()}`;
  await client.from('time_off_requests').upsert({
    id: pendingTimeOffId,
    user_id: userId,
    company_id: companyId,
    start_date: eventDate,
    end_date: eventDate,
    status: 'pending',
    type: 'pto',
    reason: 'Playwright pending PTO seed',
  });
  return pendingTimeOffId;
}

async function seedStaffApprovedPto(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  eventDate: string,
) {
  const approvedStaffPtoId = `pw-approved-pto-${Date.now()}`;
  await client.from('time_off_requests').upsert({
    id: approvedStaffPtoId,
    user_id: userId,
    company_id: companyId,
    start_date: eventDate,
    end_date: eventDate,
    status: 'approved',
    type: 'pto',
    reason: 'Playwright approved PTO seed',
  });
  return approvedStaffPtoId;
}

async function seedViolatingAssignment(
  client: SupabaseClient,
  shiftId: string,
  userId: string,
) {
  await client
    .from('schedule_assignments')
    .delete()
    .eq('schedule_id', shiftId)
    .eq('user_id', userId);
  const { error } = await client.from('schedule_assignments').insert({
    schedule_id: shiftId,
    user_id: userId,
    company_id: SCHEDULING_PW_TENANT.companyId,
    status: 'assigned',
  });
  if (error) throw error;
}

async function seedVirtualEmployees(client: SupabaseClient, count: number) {
  const ids: string[] = [];
  const now = new Date().toISOString();

  for (let index = 0; index < count; index += 1) {
    const id = `c1000000-0000-4000-8000-${String(200 + index).padStart(12, '0')}`;
    ids.push(id);
    await client.from('profiles').upsert({
      id,
      company_id: SCHEDULING_PW_TENANT.companyId,
      first_name: 'Virtual',
      last_name: `Emp${index}`,
      email: `virtual-emp-${index}@example.test`,
      role: 'staff',
      employment_status: 'active',
      updated_at: now,
    });
    await client.from('company_members').upsert({
      company_id: SCHEDULING_PW_TENANT.companyId,
      user_id: id,
      role: 'staff',
      added_at: now,
    });
  }

  return ids;
}

async function clearVirtualEmployees(client: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  await client.from('company_members').delete().in('user_id', ids);
  await client.from('profiles').delete().in('id', ids);
}

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
  if (handles.availabilityId) {
    await client.from('staff_availability').delete().eq('id', handles.availabilityId);
  }
  if (handles.pendingTimeOffId) {
    await client.from('time_off_requests').delete().eq('id', handles.pendingTimeOffId);
  }
  if (handles.approvedStaffPtoId) {
    await client.from('time_off_requests').delete().eq('id', handles.approvedStaffPtoId);
  }
  if (handles.weekTemplateId) {
    await client.from('week_templates').delete().eq('id', handles.weekTemplateId);
  }
  if (handles.virtualEmployeeIds?.length) {
    await clearVirtualEmployees(client, handles.virtualEmployeeIds);
  }
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

async function openActionsMenu(page: Page) {
  await page.getByRole('button', { name: 'Actions' }).click();
}

async function openWeekTemplatesDialog(page: Page) {
  await openActionsMenu(page);
  await page.getByRole('menuitem', { name: 'Week templates' }).click();
  await expect(page.getByTestId('week-template-dialog')).toBeVisible();
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
    await expect(page.getByTestId('schedule-readiness-bar')).toBeVisible();
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
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffFullDayAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;

    await page.reload();
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

  test('grid shows partial availability and blocks invalid template drop', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffPartialAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;

    await page.reload();
    await expect(page.getByTestId('schedule-availability-legend')).toBeVisible();
    await expect(
      page.getByTestId(
        `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${availabilitySeed.dayIso}`,
      ),
    ).toBeVisible();
    await expect(page.getByTestId('schedule-cell-availability-hint')).toContainText(
      /1:30/i,
    );

    await toggleRoleTemplates(page);
    const template = page.getByText('Barista Evening');
    const targetCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${availabilitySeed.dayIso}`,
    );
    await template.dragTo(targetCell);
    await expect(page.getByText('Cannot assign shift')).toBeVisible({ timeout: 10_000 });
  });

  test('server blocks assign when staff has no availability for shift day', async ({
    page,
  }) => {
    if (!seedHandles) return;

    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    await expect(page.getByTestId('shift-details-panel')).toBeVisible();

    await page.getByTestId('employee-selector-add').click();
    const staffOption = page.getByRole('option', { name: /Scheduling Staff/i });
    await expect(staffOption).toBeVisible();
    await staffOption.click();

    await expect(page.getByText('Assignment error')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId(`employee-assignment-${SCHEDULING_PW_TENANT.staffId}`),
    ).not.toBeVisible();
  });

  test('grid footer shows labor hours and coverage per day', async ({ page }) => {
    if (!seedHandles) return;

    await expect(page.getByTestId('schedule-grid-footer')).toBeVisible();
    const footerCell = page.getByTestId(
      `schedule-grid-footer-${seedHandles.eventDate}`,
    );
    await expect(footerCell).toBeVisible();
    await expect(footerCell).toContainText('h');
    await expect(footerCell).toContainText('%');
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

  test('staff availability panel shows hour grid copy and toggles a cell', async ({
    page,
  }) => {
    if (!adminClient) return;

    await page.context().clearCookies();
    await login(page, SCHEDULING_PW_TENANT.staffEmail, SCHEDULING_PW_TENANT.password);
    await page.goto('/app/enhanced-scheduling?panel=availability');
    await expect(page.getByRole('heading', { name: /Availability/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Filled cells are hours you can work/i),
    ).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    const firstHourCell = page.locator('tbody button:not([disabled])').first();
    await expect(firstHourCell).toBeVisible();
    await firstHourCell.click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  test('approved PTO shows blocked cell overlay on manager grid', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffFullDayAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;
    seedHandles.approvedStaffPtoId = await seedStaffApprovedPto(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
      seedHandles.eventDate,
    );

    await page.reload();
    const staffCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${seedHandles.eventDate}`,
    );
    await expect(staffCell.getByTestId('schedule-cell-blocked')).toBeVisible();
    await expect(staffCell.getByTestId('schedule-cell-blocked')).toContainText('PTO');
  });

  test('server blocks assign when staff has approved PTO', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffFullDayAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;
    seedHandles.approvedStaffPtoId = await seedStaffApprovedPto(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
      seedHandles.eventDate,
    );

    await page.reload();
    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    await expect(page.getByTestId('shift-details-panel')).toBeVisible();

    await page.getByTestId('employee-selector-add').click();
    await page.getByRole('option', { name: /Scheduling Staff/i }).click();

    await expect(page.getByText('Assignment error')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId(`employee-assignment-${SCHEDULING_PW_TENANT.staffId}`),
    ).not.toBeVisible();
  });

  test('availability layer toggle hides and restores grid overlay', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffPartialAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;

    await page.reload();
    await expect(page.getByTestId('schedule-availability-legend')).toBeVisible();

    await page.getByRole('button', { name: 'View options' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Show availability layer' }).click();
    await expect(page.getByTestId('schedule-availability-legend')).toHaveCount(0);

    await page.getByRole('button', { name: 'View options' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Show availability layer' }).click();
    await expect(page.getByTestId('schedule-availability-legend')).toBeVisible();
    await expect(page.getByTestId('schedule-cell-availability-hint')).toContainText(
      /1:30/i,
    );
  });

  test('pending PTO assign returns warning and still inserts assignment', async ({
    page,
  }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffFullDayAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;
    seedHandles.pendingTimeOffId = await seedStaffPendingPto(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
      seedHandles.eventDate,
    );

    await page.reload();
    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    await page.getByTestId('employee-selector-add').click();
    await page.getByRole('option', { name: /Scheduling Staff/i }).click();

    await expect(page.getByText('Assigned with warning')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId(`employee-assignment-${SCHEDULING_PW_TENANT.staffId}`),
    ).toBeVisible();
  });

  test('publish week blocked when assignment violates availability window', async ({
    page,
  }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffPartialAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;
    await seedViolatingAssignment(
      adminClient,
      seedHandles.shiftId,
      SCHEDULING_PW_TENANT.staffId,
    );

    await page.reload();
    await openActionsMenu(page);
    await page.getByRole('menuitem', { name: 'Publish week' }).click();
    await expect(page.getByText('Publish blocked')).toBeVisible({ timeout: 15_000 });
  });

  test('readiness panel shows availability conflicts from engine rules', async ({
    page,
  }) => {
    if (!adminClient || !seedHandles) return;

    const availabilitySeed = await seedStaffPartialAvailability(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
    );
    seedHandles.availabilityId = availabilitySeed.availabilityId;
    await seedViolatingAssignment(
      adminClient,
      seedHandles.shiftId,
      SCHEDULING_PW_TENANT.staffId,
    );

    await page.reload();
    const conflictsPill = page.getByTestId('schedule-readiness-pill-conflicts');
    await expect(conflictsPill).toBeVisible();
    await expect(conflictsPill).not.toContainText(/^0\s*conflicts/i);
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(
      page.locator('[data-testid^="schedule-readiness-conflict-"]').first(),
    ).toContainText(/availability/i);
  });

  test('shift drag moves assigned shift to another employee', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    await seedViolatingAssignment(
      adminClient,
      seedHandles.shiftId,
      SCHEDULING_PW_TENANT.staffId,
    );
    const staffAvail = await seedStaffAvailabilityForDay(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
      dayjs(seedHandles.eventDate),
      'staff',
    );
    const managerAvail = await seedStaffAvailabilityForDay(
      adminClient,
      SCHEDULING_PW_TENANT.managerId,
      SCHEDULING_PW_TENANT.companyId,
      dayjs(seedHandles.eventDate),
      'manager',
    );
    seedHandles.availabilityId = staffAvail.availabilityId;

    await page.reload();
    const sourceChip = page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).first();
    const targetCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.managerId}-${managerAvail.dayIso}`,
    );
    await dragDndKit(page, sourceChip, targetCell);
    await expect(page.getByText('Shift moved')).toBeVisible({ timeout: 15_000 });

    await adminClient.from('staff_availability').delete().eq('id', managerAvail.availabilityId);
  });

  test('shift drag blocked when target day is off for employee', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    await seedViolatingAssignment(
      adminClient,
      seedHandles.shiftId,
      SCHEDULING_PW_TENANT.staffId,
    );
    const staffAvail = await seedStaffAvailabilityForDay(
      adminClient,
      SCHEDULING_PW_TENANT.staffId,
      SCHEDULING_PW_TENANT.companyId,
      dayjs(seedHandles.eventDate),
      'staff-today',
    );
    seedHandles.availabilityId = staffAvail.availabilityId;

    const tomorrow = dayjs(seedHandles.eventDate).add(1, 'day');
    await page.reload();

    const sourceChip = page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).first();
    const offDayCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${tomorrow.format('YYYY-MM-DD')}`,
    );
    await dragDndKit(page, sourceChip, offDayCell);
    await expect(page.getByText('Cannot move shift')).toBeVisible({ timeout: 15_000 });
    await expect(sourceChip).toBeVisible();
  });

  test('week template save clear and load round-trip restores shifts', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const templateName = `PW Template ${Date.now()}`;

    await openWeekTemplatesDialog(page);
    await page.getByRole('tab', { name: 'Save Template' }).click();
    await page.getByTestId('week-template-name').fill(templateName);
    await page.getByTestId('week-template-save').click();
    await expect(page.getByText('Template saved')).toBeVisible({ timeout: 15_000 });

    const { data: templateRow } = await adminClient
      .from('week_templates')
      .select('id')
      .eq('company_id', SCHEDULING_PW_TENANT.companyId)
      .eq('name', templateName)
      .maybeSingle();
    if (templateRow?.id) {
      seedHandles.weekTemplateId = templateRow.id;
    }

    page.once('dialog', (dialog) => dialog.accept());
    await openActionsMenu(page);
    await page.getByRole('menuitem', { name: 'Clear week' }).click();

    await expect(page.getByTestId(`schedule-shift-${seedHandles.shiftId}`)).toHaveCount(0, {
      timeout: 15_000,
    });

    await openWeekTemplatesDialog(page);
    if (templateRow?.id) {
      await page.getByTestId(`week-template-load-${templateRow.id}`).click();
    } else {
      await page.getByRole('button', { name: 'Load Template' }).first().click();
    }

    await expect(page.getByTestId(`schedule-shift-${seedHandles.shiftId}`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('virtualized grid renders and scrolls for 55 employees', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    seedHandles.virtualEmployeeIds = await seedVirtualEmployees(adminClient, 55);

    await page.reload();
    await expect(page.getByTestId('schedule-grid-scroll')).toBeVisible();
    await expect(page.getByTestId('schedule-grid-virtual-body')).toBeVisible();

    await page.getByTestId('schedule-grid-scroll').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(page.locator('[data-index]').first()).toBeVisible();
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
