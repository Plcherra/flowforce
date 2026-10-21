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

const NARROW_PANELS = [
  { panel: 'staff', heading: 'Team requests' },
  { panel: 'timeoff', heading: 'My time off' },
  { panel: 'swaps', heading: 'My swaps' },
  { panel: 'workflow', heading: 'Reminders' },
] as const;

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

async function expectSheetWidth(page: Page, width: 'full' | 'narrow') {
  const sheet = page.getByTestId('scheduling-panel-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('data-panel-width', width);
  const box = await sheet.boundingBox();
  expect(box).toBeTruthy();
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  if (width === 'full') {
    expect(box!.width).toBeGreaterThan(viewport!.width * 0.9);
  } else {
    expect(box!.width).toBeLessThanOrEqual(720);
    expect(box!.width).toBeLessThan(viewport!.width * 0.7);
  }
}

test.describe('Schedule phase 5 full-width availability sheet', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await ensureSchedulingPlaywrightTenant(createSupabaseAdmin());
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await page.setViewportSize({ width: 1366, height: 900 });
    await login(page);
  });

  test('availability sheets are full width and the other four stay narrow', async ({
    page,
  }) => {
    await page.goto('/app/enhanced-scheduling?panel=availability');
    await expect(page.getByRole('heading', { name: 'My availability' })).toBeVisible();
    await expectSheetWidth(page, 'full');

    await page.getByRole('tab', { name: 'Team hours' }).click();
    await expect(page.getByRole('heading', { name: 'Team availability' })).toBeVisible();
    await expectSheetWidth(page, 'full');

    for (const entry of NARROW_PANELS) {
      await page.goto(`/app/enhanced-scheduling?panel=${entry.panel}`);
      await expect(page.getByRole('heading', { name: entry.heading })).toBeVisible();
      await expectSheetWidth(page, 'narrow');
    }
  });
});