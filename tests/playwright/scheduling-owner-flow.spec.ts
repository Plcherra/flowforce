import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Harbor!Meal9';
const stamp = Date.now();
const owner = {
  firstName: 'Avery',
  lastName: 'Cole',
  email: `avery.cole.qa.${stamp}@example.test`,
  company: 'Northline Kitchen',
};
const staff = {
  firstName: 'Riley',
  lastName: 'Quinn',
  email: `riley.quinn.qa.${stamp}@example.test`,
};
const shiftTitle = `Lunch Line ${stamp}`;
const editedTitle = `Dinner Line ${stamp}`;
const taskTitle = `Prep the line ${stamp}`;
const messageBody = `Shift update ${stamp}: dinner line is published.`;

test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  await page.screenshot({
    path: '/opt/cursor/artifacts/scheduling_flow_failure.png',
    fullPage: true,
  }).catch(() => undefined);
});

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `/opt/cursor/artifacts/${name}.png`,
    fullPage: true,
  });
}

async function fillOwnerSignup(page: Page) {
  await page.goto('/company-registration');
  await expect(page.getByLabel('First Name')).toBeVisible();
  await page.getByLabel('First Name').fill(owner.firstName);
  await page.getByLabel('Last Name').fill(owner.lastName);
  await page.getByLabel('Email Address').fill(owner.email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('Company Name').fill(owner.company);
  await page.getByText('Select industry', { exact: true }).click();
  await page.getByRole('option', { name: 'Food & Beverage' }).click();
  await page.getByText('Select size', { exact: true }).click();
  await page.getByRole('option', { name: '1-10 employees' }).click();
  await page.keyboard.press('Escape');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  if (await page.getByText('Step 1 of 5').isVisible().catch(() => false)) {
    const notes = await page.locator('[role="status"], [role="alert"]').allTextContents();
    throw new Error(`Still on step 1. Notices: ${notes.join(' | ')}`);
  }
  await expect(page.getByText('Restaurant & Food Service').first()).toBeVisible();

  await page.getByText('Restaurant & Food Service').click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Setup' }).click();
  await page.waitForURL('**/app/dashboard', { timeout: 45_000 });
  await shot(page, 'scheduling_owner_dashboard');
}

test.describe('Scheduling owner flow', () => {
  test.setTimeout(180_000);

  test('owner signup, staff invite, shift edit, conflict, publish, tasks, and messages', async ({
    browser,
    page,
  }) => {
    await fillOwnerSignup(page);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByText(owner.company).first()).toBeVisible();

    await page.goto('/app/employees?invite=1');
    const inviteDialog = page.getByRole('dialog');
    await expect(inviteDialog.getByText('Invite teammates').first()).toBeVisible();
    await inviteDialog.getByLabel('First name').fill(staff.firstName);
    await inviteDialog.getByLabel('Last name').fill(staff.lastName);
    await inviteDialog.getByLabel('Email').fill(staff.email);

    const inviteResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/employees/invite') &&
        response.request().method() === 'POST' &&
        !response.url().includes('/activate') &&
        !response.url().includes('/accept'),
    );
    await inviteDialog.getByRole('button', { name: 'Send invites' }).click();
    const invitePayload = (await (await inviteResponse).json()) as {
      ok?: boolean;
      inviteLink?: string;
      message?: string;
      results?: Array<{ ok?: boolean; inviteLink?: string; message?: string }>;
    };
    const inviteLink =
      invitePayload.inviteLink ?? invitePayload.results?.find((result) => result.inviteLink)?.inviteLink;
    expect(inviteLink, JSON.stringify(invitePayload)).toBeTruthy();
    await shot(page, 'scheduling_team_after_invite');

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.goto(inviteLink!);
    await expect(staffPage.getByRole('heading', { name: 'Activate Your Account' })).toBeVisible();
    await staffPage.getByLabel('Create Password').fill(PASSWORD);
    await staffPage.getByRole('button', { name: 'Activate Account' }).click();
    await staffPage.waitForURL('**/app/dashboard', { timeout: 45_000 });
    await shot(staffPage, 'scheduling_staff_dashboard');

    await page.goto('/app/enhanced-scheduling');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByText('Alex Rivera')).toHaveCount(0);
    await shot(page, 'scheduling_empty_week');

    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByTestId('create-menu').getByRole('button', { name: 'New shift' }).click();
    await page.getByLabel('Shift Title').fill(shiftTitle);
    await page.getByRole('tab', { name: 'Tasks' }).click();
    await page.getByPlaceholder('Task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Add shift task' }).click();
    await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Shift created').first()).toBeVisible({ timeout: 20_000 });
    const shiftChip = page.getByText(shiftTitle).first();
    await expect(shiftChip).toBeVisible({ timeout: 20_000 });
    await shot(page, 'scheduling_draft_shift');

    await shiftChip.click();
    const details = page.getByTestId('shift-details-panel');
    await expect(details).toBeVisible();
    await details.getByLabel('Title').fill(editedTitle);
    await details.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Shift updated')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(editedTitle).first()).toBeVisible();

    await page.getByTestId('employee-selector-add').click();
    await page.getByRole('option', { name: /Riley Quinn/i }).click();
    await expect(page.getByText('Assignment error')).toBeVisible({ timeout: 15_000 });
    await shot(page, 'scheduling_assignment_conflict');

    await staffPage.goto('/app/enhanced-scheduling?panel=availability');
    await expect(staffPage.getByRole('heading', { name: /Availability/i })).toBeVisible();
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayIndex = (new Date().getDay() + 6) % 7;
    const dayLabel = dayLabels[dayIndex];
    const dayRow = staffPage.getByTestId(`availability-day-${dayLabel.toLowerCase()}`);
    await dayRow.getByLabel(`${dayLabel} from`).fill('09:00');
    await dayRow.getByLabel(`${dayLabel} to`).fill('17:00');
    await staffPage.getByRole('button', { name: 'Save changes' }).click();
    await expect(staffPage.getByText('Availability saved', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(staffPage.getByText('Unable to save')).toHaveCount(0);
    await shot(staffPage, 'scheduling_staff_availability');

    await page.reload();
    await page.getByText(editedTitle).first().click();
    await page.getByTestId('employee-selector-add').click();
    await page.getByRole('option', { name: /Riley Quinn/i }).click();
    const assignedToast = page.getByText(/Employee assigned|Assigned with warning/);
    try {
      await expect(assignedToast).toBeVisible({ timeout: 15_000 });
    } catch (error) {
      const notices = await page.locator('[role="status"]').allTextContents();
      throw new Error(`Assign did not succeed. Notices: ${notices.join(' | ')}`, {
        cause: error,
      });
    }
    await shot(page, 'scheduling_staff_assigned');

    await details.getByRole('button', { name: 'Close shift details' }).click();
    await expect(details).toBeHidden();

    await page.getByRole('button', { name: 'Week desk' }).click();
    await page.getByRole('button', { name: 'Publish to the team' }).click();
    await expect(page.getByText('Week published')).toBeVisible({ timeout: 20_000 });
    await shot(page, 'scheduling_published_week');

    await staffPage.goto('/app/enhanced-scheduling');
    await expect(staffPage.getByRole('heading', { name: 'My Schedule' })).toBeVisible();
    await expect(staffPage.getByText(editedTitle).first()).toBeVisible({ timeout: 20_000 });
    await shot(staffPage, 'scheduling_staff_my_schedule');

    await page.goto('/app/tasks');
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, 'scheduling_connected_task');

    await page.goto('/app/messages');
    await page.getByRole('button', { name: 'New chat' }).click();
    await expect(page.getByRole('heading', { name: 'Choose someone' })).toBeVisible();
    await page.getByRole('button', { name: /Riley Quinn/ }).click();
    const composer = page.getByPlaceholder(/Message /);
    await expect(composer).toBeVisible({ timeout: 15_000 });
    await composer.fill(messageBody);
    await composer.press('Enter');
    await expect(page.getByText(messageBody)).toBeVisible({ timeout: 15_000 });
    await shot(page, 'scheduling_connected_message');

    await staffContext.close();
  });
});
