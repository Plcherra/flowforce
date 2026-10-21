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
const FORM_TITLE = 'Playwright Barista Checklist';

function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function login(page: Page, email: string) {
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
    await page.getByLabel('Password').fill(SCHEDULING_PW_TENANT.password);
    await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });
    await page.waitForURL('**/app/dashboard', { timeout: 15_000 });
  }).toPass({ timeout: 40_000 });
}

test.describe('Schedule phase 20 assign a form reminder', () => {
  test.skip(
    !SHOULD_RUN || !HAS_SUPABASE_CREDS,
    'Enable with PLAYWRIGHT_SMOKE=1 and provide Supabase service-role credentials.',
  );

  let admin: SupabaseClient;
  let formId = '';

  test.beforeAll(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    admin = createSupabaseAdmin();
    await ensureSchedulingPlaywrightTenant(admin);
  });

  test.beforeEach(async ({ page }) => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    formId = randomUUID();
    await admin.from('org_prefs').upsert(
      { id: SCHEDULING_PW_TENANT.companyId, availability_choice: null },
      { onConflict: 'id' },
    );
    const { error: formError } = await admin.from('forms').insert({
      id: formId,
      company_id: SCHEDULING_PW_TENANT.companyId,
      created_by: SCHEDULING_PW_TENANT.managerId,
      title: FORM_TITLE,
      status: 'published',
    });
    if (formError) throw formError;
    await login(page, SCHEDULING_PW_TENANT.managerEmail);
  });

  test.afterEach(async () => {
    if (!SHOULD_RUN || !HAS_SUPABASE_CREDS) return;
    await admin
      .from('reminders')
      .delete()
      .eq('user_id', SCHEDULING_PW_TENANT.staffId)
      .like('type', `record.form:${formId}`);
    if (formId) await admin.from('forms').delete().eq('id', formId);
  });

  test('a manager assigns a form reminder and the staff user sees the time and repeat', async ({
    page,
  }) => {
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
    const assignForm = page.getByTestId('assign-form-reminder');
    await expect(assignForm).toBeVisible();
    await assignForm.getByLabel('Form reminder').click();
    await page.getByRole('option', { name: FORM_TITLE }).click();
    await assignForm.getByLabel('Form reminder recipient').click();
    await page.getByRole('option', { name: 'Scheduling Staff' }).click();
    await assignForm.getByLabel('Form reminder time').fill('09:00');
    await assignForm.getByLabel('How often').click();
    await page.getByRole('option', { name: 'Weekly' }).click();
    await page.getByRole('button', { name: 'Assign form reminder' }).click();
    await expect(page.getByText('Form reminder assigned')).toBeVisible();

    await login(page, SCHEDULING_PW_TENANT.staffEmail);
    await page.goto('/app/enhanced-scheduling?panel=workflow');
    const row = page.getByTestId('assigned-reminder').filter({ hasText: FORM_TITLE });
    await expect(row).toBeVisible();
    await expect(row.getByTestId('assigned-reminder-time')).toHaveText('09:00');
    await expect(row.getByTestId('assigned-reminder-repeat')).toHaveText('Weekly');
  });
});
