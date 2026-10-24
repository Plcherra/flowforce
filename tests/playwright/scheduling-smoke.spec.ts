import { randomUUID } from 'node:crypto';
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

function availabilityTimestamp(day: dayjs.Dayjs, time: string) {
  return `${day.format('YYYY-MM-DD')}T${time}:00.000Z`;
}

async function seedStaffPartialAvailability(
  client: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const today = dayjs().startOf('day');
  const availabilityId = randomUUID();
  const weekStart = isoWeekStart(today);

  const { error } = await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(today),
    start_time: availabilityTimestamp(today, '06:00'),
    end_time: availabilityTimestamp(today, '13:30'),
    week_start_date: weekStart,
    is_preferred: true,
  });
  if (error) throw error;

  return { availabilityId, weekStart, dayIso: today.format('YYYY-MM-DD') };
}

async function seedStaffFullDayAvailability(
  client: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const today = dayjs().startOf('day');
  const availabilityId = randomUUID();
  const weekStart = isoWeekStart(today);

  const { error } = await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(today),
    start_time: availabilityTimestamp(today, '06:00'),
    end_time: availabilityTimestamp(today, '21:00'),
    week_start_date: weekStart,
    is_preferred: true,
  });
  if (error) throw error;

  return { availabilityId, weekStart, dayIso: today.format('YYYY-MM-DD') };
}

async function seedStaffAvailabilityForDay(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  day: dayjs.Dayjs,
  _suffix: string,
) {
  const availabilityId = randomUUID();
  const weekStart = isoWeekStart(day);

  const { error } = await client.from('staff_availability').upsert({
    id: availabilityId,
    user_id: userId,
    company_id: companyId,
    day_of_week: dayOfWeekIndex(day),
    start_time: availabilityTimestamp(day, '06:00'),
    end_time: availabilityTimestamp(day, '21:00'),
    week_start_date: weekStart,
    is_preferred: true,
  });
  if (error) throw error;

  return { availabilityId, dayIso: day.format('YYYY-MM-DD') };
}

async function seedStaffPendingPto(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  eventDate: string,
) {
  const pendingTimeOffId = randomUUID();
  const { error } = await client.from('time_off_requests').upsert({
    id: pendingTimeOffId,
    user_id: userId,
    company_id: companyId,
    start_date: eventDate,
    end_date: eventDate,
    status: 'pending',
    type: 'pto',
    reason: 'Playwright pending PTO seed',
  });
  if (error) throw error;
  return pendingTimeOffId;
}

async function seedStaffApprovedPto(
  client: SupabaseClient,
  userId: string,
  companyId: string,
  eventDate: string,
) {
  const approvedStaffPtoId = randomUUID();
  const { error } = await client.from('time_off_requests').upsert({
    id: approvedStaffPtoId,
    user_id: userId,
    company_id: companyId,
    start_date: eventDate,
    end_date: eventDate,
    status: 'approved',
    type: 'pto',
    reason: 'Playwright approved PTO seed',
  });
  if (error) throw error;
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
    const email = `virtual-emp-${index}@example.test`;
    const { error: authError } = await client.auth.admin.createUser({
      id,
      email,
      password: SCHEDULING_PW_TENANT.password,
      email_confirm: true,
    });
    if (
      authError &&
      !authError.message.toLowerCase().includes('already') &&
      !authError.message.toLowerCase().includes('registered')
    ) {
      throw authError;
    }
    const { error: profileError } = await client.from('profiles').upsert({
      id,
      company_id: SCHEDULING_PW_TENANT.companyId,
      first_name: 'Virtual',
      last_name: `Emp${index}`,
      email,
      role: 'staff',
      employment_status: 'active',
      updated_at: now,
    });
    if (profileError) throw profileError;
    const { error: memberError } = await client.from('company_members').upsert(
      {
        company_id: SCHEDULING_PW_TENANT.companyId,
        user_id: id,
        role: 'staff',
        added_at: now,
      },
      { onConflict: 'company_id,user_id' },
    );
    if (memberError) throw memberError;
  }

  return ids;
}

async function resetPlaywrightSchedulingData(client: SupabaseClient) {
  const companyId = SCHEDULING_PW_TENANT.companyId;
  const steps = [
    client.from('schedule_assignments').delete().eq('company_id', companyId),
    client.from('event_shift_links').delete().eq('company_id', companyId),
    client.from('calendar_events').delete().eq('company_id', companyId),
    client.from('vendor_visits').delete().eq('company_id', companyId),
    client.from('tasks').delete().eq('company_id', companyId),
    client.from('shift_templates').delete().eq('company_id', companyId),
    client.from('vendor_event').delete().eq('company_id', companyId),
    client.from('time_off_requests').delete().eq('company_id', companyId),
    client.from('staff_availability').delete().eq('company_id', companyId),
    client.from('week_templates').delete().eq('company_id', companyId),
    client.from('schedules').delete().eq('company_id', companyId),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) throw error;
  }
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
  const shiftId = randomUUID();
  const timeOffId = randomUUID();
  const eventDate = today.format('YYYY-MM-DD');
  const published = options?.published ?? false;

  const { error: scheduleError } = await client.from('schedules').upsert({
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
  if (scheduleError) throw scheduleError;

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

async function expectNoPageOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `${label} page is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function login(page: Page, email: string, password: string) {
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
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

async function openSchedulePage(page: Page, heading: string | RegExp = 'Schedule') {
  await page.goto('/app/enhanced-scheduling');
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function openWeekDesk(page: Page) {
  await page.getByRole('button', { name: 'Week desk' }).click();
}

async function toggleRoleTemplates(page: Page) {
  await openWeekDesk(page);
  await page.getByRole('button', { name: 'Role templates' }).click();
  await expect(page.getByText('Role Templates', { exact: true })).toBeVisible();
}

async function openWeekTemplatesDialog(page: Page) {
  await openWeekDesk(page);
  await page.getByRole('button', { name: 'Week blueprints' }).click();
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
  test.describe.configure({ mode: 'serial' });
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
    await resetPlaywrightSchedulingData(adminClient);
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
    await expect(page.getByTestId(`schedule-shift-${seedHandles.shiftId}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
  });

  test('mobile viewport renders manager schedule shell', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Week desk' })).toBeVisible();
  });

  test('schedule screens stay inside the viewport on phone, tablet, and desktop', async ({
    page,
  }) => {
    if (!seedHandles) return;

    const widths = [
      { name: 'phone', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ];

    for (const viewport of widths) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/app/enhanced-scheduling');
      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
      await expectNoPageOverflow(page, viewport.name);

      const shiftChip = page.getByTestId(`schedule-shift-${seedHandles.shiftId}`);
      await expect(shiftChip).toBeVisible({ timeout: 15_000 });
      const chipBox = await shiftChip.boundingBox();
      expect(chipBox, `${viewport.name} shift chip`).toBeTruthy();
      expect(chipBox!.x).toBeGreaterThanOrEqual(-1);
      expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(viewport.width + 1);

      await shiftChip.click();
      const details = page.getByTestId('shift-details-panel');
      await expect(details).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
      await expect(details.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
      const close = details.getByRole('button', { name: 'Close shift details' });
      await expect(close).toBeVisible();
      await expect
        .poll(async () => {
          const box = await close.boundingBox();
          return box ? box.x + box.width : viewport.width + 100;
        })
        .toBeLessThanOrEqual(viewport.width + 1);
      const closeBox = await close.boundingBox();
      expect(closeBox!.x).toBeGreaterThanOrEqual(0);

      const dateInputs = details.locator('input[type="datetime-local"]');
      await expect(dateInputs).toHaveCount(2);
      for (const input of await dateInputs.all()) {
        const box = await input.boundingBox();
        expect(box, `${viewport.name} datetime input`).toBeTruthy();
        expect(box!.width).toBeGreaterThan(160);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      }
      await close.click();
      await expect(details).toBeHidden();

      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByTestId('create-menu').getByRole('button', { name: 'Mark unavailability' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Add Unavailability' })).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(4);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width - 4);
      for (const input of await dialog.locator('input[type="datetime-local"]').all()) {
        const box = await input.boundingBox();
        expect(box!.width).toBeGreaterThan(160);
        expect(box!.x + box!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
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

    await expect(page.getByText('Employee assigned', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
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
    await expect(page.getByText('Cannot assign shift', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
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

    await expect(page.getByText('Assignment error', { exact: true })).toBeVisible({
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
    if (!adminClient || !seedHandles) return;

    await adminClient
      .from('schedules')
      .update({
        start_time: dayjs(seedHandles.eventDate).hour(9).minute(0).second(0).toISOString(),
        end_time: dayjs(seedHandles.eventDate).hour(11).minute(0).second(0).toISOString(),
      })
      .eq('id', seedHandles.shiftId);
    await page.reload();
    await toggleRoleTemplates(page);

    const dropTarget = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${seedHandles.eventDate}`,
    );
    await dropTarget.scrollIntoViewIfNeeded();
    const dropTestId = `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${seedHandles.eventDate}`;
    await page.getByTestId('vendor-palette-vendor-inspection').evaluate((element, targetTestId) => {
      const target = document.querySelector(`[data-testid="${targetTestId}"]`);
      if (!(target instanceof HTMLElement)) {
        throw new Error(`Missing drop target ${targetTestId}`);
      }
      const dataTransfer = new DataTransfer();
      element.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
      );
    }, dropTestId);

    await expect(page.getByTestId('vendor-event-dialog')).toBeVisible();

    await page.getByTestId('vendor-event-shift-select').click();
    await page.getByRole('option', { name: /Playwright Smoke Shift/i }).click();
    await page.getByTestId('vendor-event-save').click();

    await expect(page.getByTestId('vendor-event-dialog')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Scheduling Error')).toHaveCount(0);
    await expect(page.getByText('Vendor · Health Inspection').first()).toBeVisible({
      timeout: 15_000,
    });
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
    await expect(page.getByTestId('availability-weekday-rows')).toBeVisible();
    await page
      .getByTestId('availability-day-mon')
      .getByRole('button', { name: 'Available all day' })
      .click();
    await expect(page.getByRole('button', { name: 'Send availability' })).toBeEnabled();
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

    await expect(page.getByText('Assignment error', { exact: true })).toBeVisible({
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

    await openWeekDesk(page);
    const shading = page.getByRole('switch', { name: 'Availability shading' });
    await shading.click();
    await expect(page.getByTestId('schedule-availability-legend')).toHaveCount(0);

    await shading.click();
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

    await expect(
      page.getByLabel('Notifications (F8)').getByText(/pending PTO/i),
    ).toBeVisible({
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
    const conflictsPill = page.getByTestId('schedule-readiness-pill-conflicts');
    await expect(conflictsPill).toBeVisible();
    await expect(conflictsPill).not.toContainText(/^0\s*conflicts/i);
    await openWeekDesk(page);
    await page.getByRole('button', { name: 'Publish to the team' }).click();
    await expect(page.getByText('Publish blocked', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
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
    const conflict = page.locator('[data-testid^="schedule-readiness-conflict-"]').first();
    if (!(await conflict.isVisible())) {
      await page.getByRole('button', { name: 'More options', exact: true }).click();
    }
    await expect(conflict).toContainText(/availability/i);
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
    await adminClient.from('time_off_requests').delete().eq('id', seedHandles.timeOffId);

    await page.reload();
    const sourceChip = page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).first();
    const targetCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.managerId}-${managerAvail.dayIso}`,
    );
    await dragDndKit(page, sourceChip, targetCell);
    await expect(
      targetCell.getByTestId(`schedule-shift-${seedHandles.shiftId}`),
    ).toBeVisible({
      timeout: 15_000,
    });

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

    const shiftDay = dayjs(seedHandles.eventDate);
    const nextDay = shiftDay.add(1, 'day');
    const displayedWeek = (day: dayjs.Dayjs) => day.subtract(day.day(), 'day');
    const offDay = displayedWeek(nextDay).isSame(displayedWeek(shiftDay), 'day')
      ? nextDay
      : shiftDay.subtract(1, 'day');
    await page.reload();

    const sourceChip = page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).first();
    const offDayCell = page.getByTestId(
      `schedule-cell-${SCHEDULING_PW_TENANT.staffId}-${offDay.format('YYYY-MM-DD')}`,
    );
    await dragDndKit(page, sourceChip, offDayCell);
    await expect(page.getByText('Cannot move shift', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(sourceChip).toBeVisible();
  });

  test('week template save clear and load round-trip restores shifts', async ({ page }) => {
    if (!adminClient || !seedHandles) return;

    const templateName = `PW Template ${Date.now()}`;

    await openWeekTemplatesDialog(page);
    await page.getByRole('tab', { name: 'Save Template' }).click();
    await page.getByTestId('week-template-name').fill(templateName);
    await page.getByTestId('week-template-save').click();
    await expect(page.getByText('Template saved', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId('week-template-dialog').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('week-template-dialog')).toBeHidden();

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
    await openWeekDesk(page);
    await page.getByRole('button', { name: 'Empty this week' }).click();

    await expect(page.getByTestId(`schedule-shift-${seedHandles.shiftId}`)).toHaveCount(0, {
      timeout: 15_000,
    });

    await openWeekTemplatesDialog(page);
    if (templateRow?.id) {
      await page.getByTestId(`week-template-load-${templateRow.id}`).click();
    } else {
      await page.getByRole('button', { name: 'Load Template' }).first().click();
    }

    await expect(page.getByText('Playwright Smoke Shift').first()).toBeVisible({
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

  test('shift details links a visit, adds a task, and saves a template', async ({ page }) => {
    if (!seedHandles) return;

    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    const details = page.getByTestId('shift-details-panel');
    await expect(details).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
    await expect(details.getByRole('button', { name: 'Close shift details' })).toHaveCount(1);

    await details.getByRole('button', { name: 'Add vendor visit' }).click();
    await details.getByRole('textbox', { name: 'Visit type' }).fill('Delivery');
    await details.getByRole('button', { name: 'Save visit type' }).click();
    await expect(details.getByRole('button', { name: 'Delivery', exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Delete Delivery' }).click();
    await expect(details.getByRole('button', { name: 'Delivery', exact: true })).toHaveCount(0);
    await details.getByLabel('Vendor name').fill('Health Inspection');
    await details.getByRole('button', { name: 'Save visit', exact: true }).click();
    await expect(details.getByPlaceholder('Event title')).toHaveValue('Health Inspection', {
      timeout: 15_000,
    });
    await expect(page.getByText('Vendor visit not saved')).toHaveCount(0);
    await expect(details.getByText('Vendor_visit')).toHaveCount(0);

    await details.getByRole('tab', { name: 'Tasks' }).click();
    await expect(details.getByRole('heading', { name: 'Lists on this shift' })).toBeVisible();
    await expect(details.getByText('No list attached.')).toBeVisible();
    await expect(details.getByRole('heading', { name: 'Shift tasks' })).toBeVisible();
    await expect(details.getByPlaceholder('Task title')).toHaveCount(0);

    await details.getByRole('tab', { name: 'Templates' }).click();
    await details.getByRole('button', { name: 'Save as Shift Template' }).click();
    await expect(page.getByText('Template saved', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Close shift details' }).click();
    await expect(details).toBeHidden();
    await page.getByTestId(`schedule-shift-${seedHandles.shiftId}`).click();
    await expect(details).toBeVisible();
    await details.getByRole('tab', { name: 'Templates' }).click();
    await details.getByLabel('Shift template').click();
    await expect(page.getByRole('option', { name: 'Playwright Smoke Shift', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    await details.getByRole('tab', { name: 'Details' }).click();
    await details.getByLabel('Title').fill('Renamed shift');
    await details.getByRole('tab', { name: 'Templates' }).click();
    await details.getByLabel('Shift template').click();
    await page.getByRole('option', { name: 'Playwright Smoke Shift', exact: true }).click();
    await details.getByRole('button', { name: 'Load from Template' }).click();
    await expect(details.getByLabel('Title')).toHaveValue('Playwright Smoke Shift');
    await expect(page.getByText('Template loaded', { exact: true })).toBeVisible();
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
