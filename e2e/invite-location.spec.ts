import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("invites a teammate to a real store the signed-in user can assign", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({
    timeout: 20_000,
  });

  const inviteButton = page.getByTestId("employees-invite-button").first();
  await expect(inviteButton).toBeVisible({ timeout: 20_000 });
  await inviteButton.click();

  const dialog = page.getByTestId("invite-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("invite-class")).toHaveAttribute(
    "data-selected",
    "true",
    { timeout: 20_000 },
  );

  const location = dialog.getByTestId("invite-location");
  await expect(location).toBeVisible({ timeout: 20_000 });
  await location.click();
  const option = page.getByTestId("invite-location-option").first();
  await expect(option).toBeVisible();
  const storeName = ((await option.textContent()) ?? "").trim();
  const storeId = await option.getAttribute("data-location-id");
  expect(storeName.length).toBeGreaterThan(0);
  expect(storeId).toBeTruthy();
  await option.click();
  await expect(location).toContainText(storeName);

  const email = `e2e-invite-${Date.now()}@example.com`;
  await dialog.locator('input[type="email"]').fill(email);

  let captured: { locationId?: string; email?: string } | null = null;
  // The test login uses the production project. Fulfill the invite
  // request here so the run does not write a row or send an email.
  await page.route("**/api/employees/invite", async (route) => {
    const body = route.request().postDataJSON() as {
      invites?: Array<{ locationId?: string; email?: string }>;
    };
    captured = body.invites?.[0] ?? null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        inviteLink: null,
        results: [
          {
            ok: true,
            email,
            inviteLink: null,
          },
        ],
      }),
    });
  });

  await dialog.getByTestId("invite-send").click();
  await expect.poll(() => captured?.email).toBe(email);
  expect(captured?.locationId).toBe(storeId);
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";

  await page.goto("/auth?redirectTo=%2Fapp%2Femployees");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
