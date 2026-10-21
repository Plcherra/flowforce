import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
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

async function expectOpaqueFill(chip: Locator, rgb: [number, number, number]) {
  const color = await chip.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  expect(match, color).toBeTruthy();
  expect(Number(match?.[1])).toBe(rgb[0]);
  expect(Number(match?.[2])).toBe(rgb[1]);
  expect(Number(match?.[3])).toBe(rgb[2]);
  if (match?.[4] != null) expect(Number(match[4])).toBe(1);
}

test.describe('Schedule phase 4 opaque shift chips', () => {
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

  test('shows two same-day role chips as opaque colors', async ({ page }) => {
    const start = dayjs().startOf('day').add(9, 'hour');
    const end = start.add(4, 'hour');
    const baristaId = randomUUID();
    const cookId = randomUUID();
    const openId = randomUUID();
    const rows = [
      {
        id: baristaId,
        title: 'Morning Bar',
        role: 'Barista',
        color: '#f59e0b',
        assign: true,
      },
      {
        id: cookId,
        title: 'Line Cook',
        role: 'Cook',
        color: '#ef4444',
        assign: true,
      },
      {
        id: openId,
        title: 'Open Runner',
        role: 'Runner',
        color: '#3b82f6',
        assign: false,
      },
    ];

    for (const row of rows) {
      const { error } = await admin.from('schedules').insert({
        id: row.id,
        title: row.title,
        role: row.role,
        color: row.color,
        company_id: SCHEDULING_PW_TENANT.companyId,
        created_by: SCHEDULING_PW_TENANT.managerId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_published: false,
        status: 'scheduled',
      });
      if (error) throw error;
      if (!row.assign) continue;
      const { error: assignmentError } = await admin.from('schedule_assignments').insert({
        schedule_id: row.id,
        user_id: SCHEDULING_PW_TENANT.staffId,
        company_id: SCHEDULING_PW_TENANT.companyId,
        status: 'assigned',
      });
      if (assignmentError) throw assignmentError;
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

    const barista = page.getByTestId(`schedule-shift-${baristaId}`);
    const cook = page.getByTestId(`schedule-shift-${cookId}`);
    const runner = page.getByTestId(`schedule-shift-${openId}`);
    await expect(barista).toBeVisible();
    await expect(cook).toBeVisible();
    await expect(barista).toHaveAttribute('data-opaque', 'true');
    await expect(cook).toHaveAttribute('data-opaque', 'true');
    await expectOpaqueFill(barista, [245, 158, 11]);
    await expectOpaqueFill(cook, [239, 68, 68]);
    await expect(barista.getByTestId('shift-chip-role')).toHaveText('Barista');
    await expect(cook.getByTestId('shift-chip-role')).toHaveText('Cook');
    await expect(barista.getByTestId('shift-chip-title')).toHaveText('Morning Bar');
    await expect(cook.getByTestId('shift-chip-title')).toHaveText('Line Cook');

    await expect(runner).toHaveAttribute('data-opaque', 'false');
    await expect(runner.getByTestId('shift-chip-role')).toHaveText('Runner');
    const runnerColor = await runner.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(runnerColor.replace(/\s/g, '')).not.toBe('rgb(59,130,246)');
  });
});