import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  cleanupSchedulingPlaywrightTenant,
  ensureSchedulingPlaywrightTenant,
  SCHEDULING_PW_TENANT,
} from './helpers/schedulingPlaywrightTenant';

const SHOULD_RUN = process.env.PLAYWRIGHT_SMOKE === '1';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_SUPABASE_CREDS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const TEMPLATE_NAME = 'Opening Bar';
const POSITION_NAME = 'Barista';

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

test.describe('Schedule phase 3 load a shift template in the wizard', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let templateId = '';
  let positionId = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await cleanupSchedulingPlaywrightTenant(admin);
    positionId = randomUUID();
    templateId = randomUUID();
    const { error: positionError } = await admin.from('positions').insert({
      id: positionId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      name: POSITION_NAME,
      is_active: true,
      created_by: SCHEDULING_PW_TENANT.managerId,
    });
    if (positionError) throw positionError;
    const { error: templateError } = await admin.from('shift_templates').insert({
      id: templateId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      name: TEMPLATE_NAME,
      duration_hours: 4,
      is_all_day: false,
      job_position_id: positionId,
      required_headcount: 3,
      default_notes: 'Do not copy this note',
      created_by: SCHEDULING_PW_TENANT.managerId,
    });
    if (templateError) throw templateError;
    await login(page);
  });

  test.afterEach(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS || !admin) return;
    if (templateId) {
      await admin.from('shift_templates').delete().eq('id', templateId);
    }
    if (positionId) {
      await admin.from('positions').delete().eq('id', positionId);
    }
  });

  test('loads a template into the open wizard and leaves that wizard open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByTestId('create-menu').getByRole('button', { name: 'New shift' }).click();

    const wizard = page.getByRole('dialog');
    await expect(wizard.getByRole('heading', { name: 'Create New Shift' })).toBeVisible();
    await wizard.getByLabel('Start').fill('08:00');
    await wizard.getByLabel('Location').fill('Front counter');
    await wizard.getByRole('tab', { name: 'Notes' }).click();
    await wizard.getByLabel('Notes').fill('Keep this note');
    await wizard.getByRole('tab', { name: 'Details' }).click();

    const loader = wizard.getByLabel('Load shift template');
    await expect(loader.locator('option', { hasText: TEMPLATE_NAME })).toHaveCount(1);
    await loader.selectOption({ label: TEMPLATE_NAME });

    await expect(wizard.getByRole('heading', { name: 'Create New Shift' })).toBeVisible();
    await expect(wizard.getByLabel('Shift Title')).toHaveValue(TEMPLATE_NAME);
    await expect(wizard.getByLabel('Start')).toHaveValue('08:00');
    await expect(wizard.getByLabel('End')).toHaveValue('12:00');
    await expect(wizard.getByLabel('Job Position')).toHaveValue(POSITION_NAME);
    await expect(wizard.getByLabel('Headcount')).toHaveValue('3');
    await expect(wizard.getByLabel('Location')).toHaveValue('Front counter');
    await wizard.getByRole('tab', { name: 'Notes' }).click();
    await expect(wizard.getByLabel('Notes')).toHaveValue('Keep this note');
    await expect(page.getByText('Shift created')).toHaveCount(0);
    await expect(wizard).toBeVisible();
  });
});