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
const SHIFT_TITLE = 'Phase 1 Minimized Shift';

function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function seedShift(client: SupabaseClient) {
  const shiftId = randomUUID();
  const start = dayjs().startOf('day').add(12, 'hour');
  const { error } = await client.from('schedules').upsert({
    id: shiftId,
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
  return shiftId;
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

async function toggleMinimizedView(page: Page) {
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Minimized view' }).click();
  await page.keyboard.press('Escape');
}

test.describe('Schedule phase 1 minimized view and role templates', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let shiftId = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await cleanupSchedulingPlaywrightTenant(admin);
    shiftId = await seedShift(admin);
    await login(page);
    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
  });

  test.afterAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    await cleanupSchedulingPlaywrightTenant(admin);
  });

  test('toggles minimized chips and opens a role template in the wizard', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const chip = page.getByTestId(`schedule-shift-${shiftId}`);
    await expect(chip).toBeVisible();
    await expect(chip.getByTestId('shift-chip-title')).toHaveText(SHIFT_TITLE);
    await expect(chip.getByTestId('shift-chip-time')).toBeVisible();
    await expect(chip.getByTestId('shift-chip-duration')).toContainText('hrs');
    await expect(chip).toHaveAttribute('data-minimized', 'false');

    const fullChipBox = await chip.boundingBox();
    const employeeRow = page.getByTestId('schedule-employee-row').first();
    const fullRowBox = await employeeRow.boundingBox();
    expect(fullChipBox).toBeTruthy();
    expect(fullRowBox).toBeTruthy();

    await toggleMinimizedView(page);

    await expect(page.getByTestId('schedule-week-grid')).toHaveAttribute(
      'data-minimized',
      'true',
    );
    await expect(chip).toHaveAttribute('data-minimized', 'true');
    await expect(chip.getByTestId('shift-chip-title')).toHaveText(SHIFT_TITLE);
    await expect(chip.getByTestId('shift-chip-time')).toHaveCount(0);
    await expect(chip.getByTestId('shift-chip-duration')).toHaveCount(0);
    await expect(employeeRow).toHaveAttribute('data-minimized', 'true');

    const compactChipBox = await chip.boundingBox();
    const compactRowBox = await employeeRow.boundingBox();
    expect(compactChipBox!.height).toBeLessThan(fullChipBox!.height);
    expect(compactRowBox!.height).toBeLessThan(fullRowBox!.height);

    await toggleMinimizedView(page);

    await expect(page.getByTestId('schedule-week-grid')).toHaveAttribute(
      'data-minimized',
      'false',
    );
    await expect(chip.getByTestId('shift-chip-time')).toBeVisible();
    await expect(chip.getByTestId('shift-chip-duration')).toBeVisible();
    const restoredChipBox = await chip.boundingBox();
    const restoredRowBox = await employeeRow.boundingBox();
    expect(restoredChipBox!.height).toBeGreaterThan(compactChipBox!.height);
    expect(restoredRowBox!.height).toBeGreaterThan(compactRowBox!.height);

    await page.getByRole('button', { name: 'View options' }).click();
    await page.getByRole('menuitem', { name: 'Toggle role templates' }).click();
    const template = page.getByTestId('role-template-1');
    await expect(template).toBeVisible();
    await expect(template).toHaveAttribute('draggable', 'true');
    await expect(template).toContainText('Barista Morning');

    await template.click();
    const wizard = page.getByRole('dialog');
    await expect(wizard.getByRole('heading', { name: 'Create New Shift' })).toBeVisible();
    await expect(wizard.getByLabel('Shift Title')).toHaveValue('Barista Morning');
    await expect(wizard.getByLabel('Start')).toHaveValue('06:00');
    await expect(wizard.getByLabel('End')).toHaveValue('14:00');
    await expect(wizard.getByLabel('Job Position')).toHaveValue('Barista');

    await page.keyboard.press('Escape');
    await expect(wizard).toBeHidden();

    await template.evaluate((element) => {
      const dataTransfer = new DataTransfer();
      element.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }),
      );
    });
    await expect(page.getByRole('heading', { name: 'Create New Shift' })).toHaveCount(0);
  });
});
