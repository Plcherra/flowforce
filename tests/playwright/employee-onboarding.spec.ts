import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Harbor!Meal9";
const stamp = Date.now();
const owner = {
  firstName: "Avery",
  lastName: "Cole",
  email: `avery.cole.onboard.${stamp}@example.test`,
  company: `Harbor Coffee ${stamp}`,
};
const staff = {
  firstName: "Riley",
  lastName: "Quinn",
  email: `riley.quinn.onboard.${stamp}@example.test`,
};

test.describe.configure({ mode: "serial" });

async function fillOwnerSignup(page: Page) {
  await page.goto("/company-registration");
  await expect(page.getByLabel("First Name")).toBeVisible();
  await page.getByLabel("First Name").fill(owner.firstName);
  await page.getByLabel("Last Name").fill(owner.lastName);
  await page.getByLabel("Email Address").fill(owner.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel("Company Name").fill(owner.company);
  await page.getByText("Select industry", { exact: true }).click();
  await page.getByRole("option", { name: "Food & Beverage" }).click();
  await page.getByText("Select size", { exact: true }).click();
  await page.getByRole("option", { name: "1-10 employees" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Restaurant & Food Service").first()).toBeVisible();
  await page.getByText("Restaurant & Food Service").click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Complete Setup" }).click();
  await page.waitForURL("**/app/dashboard", { timeout: 45_000 });
}

test.describe("Employee onboarding with separate users", () => {
  test.setTimeout(180_000);

  test("owner sets shop steps and the invited barista finishes them", async ({ browser, page }) => {
    await fillOwnerSignup(page);
    await page.goto("/app/settings?tab=onboarding");
    await expect(page.getByTestId("onboarding-settings")).toBeVisible({ timeout: 30_000 });
    const missing = page.getByText("apply the latest database migration");
    if (await missing.isVisible().catch(() => false)) {
      throw new Error("Apply the employee onboarding migration before this test.");
    }

    await page.getByLabel("Welcome title").fill(`Welcome to ${owner.company}`);
    await page.getByLabel("Welcome message").fill("Read the handbook and add your photo ID before your first open.");
    await page.getByRole("button", { name: "Save welcome" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    await page.getByLabel("Document name").fill("Shop handbook");
    await page.getByLabel("Upload document").setInputFiles({
      name: "handbook.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 handbook"),
    });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByText("Shop handbook").first()).toBeVisible();

    await page.getByLabel("Step title").fill("Read the shop handbook");
    await page.getByLabel("Shop document").selectOption({ label: "Shop handbook" });
    await page.getByTestId("onboarding-add-step").click();
    await expect(page.getByText("Read the shop handbook").first()).toBeVisible();

    await page.getByLabel("Step title").fill("Photo ID or right to work");
    await page.getByLabel("What they do").selectOption("upload");
    await page.getByTestId("onboarding-add-step").click();
    await expect(page.getByText("Photo ID or right to work").first()).toBeVisible();

    await page.goto("/app/employees?invite=1");
    const inviteDialog = page.getByRole("dialog");
    await inviteDialog.getByLabel("First name").fill(staff.firstName);
    await inviteDialog.getByLabel("Last name").fill(staff.lastName);
    await inviteDialog.getByLabel("Email").fill(staff.email);
    const inviteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/employees/invite") &&
        response.request().method() === "POST" &&
        !response.url().includes("/activate") &&
        !response.url().includes("/accept"),
    );
    await inviteDialog.getByRole("button", { name: "Send invites" }).click();
    const invitePayload = (await (await inviteResponse).json()) as {
      inviteLink?: string;
      results?: Array<{ inviteLink?: string }>;
    };
    const inviteLink =
      invitePayload.inviteLink ?? invitePayload.results?.find((result) => result.inviteLink)?.inviteLink;
    expect(inviteLink).toBeTruthy();

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.goto(inviteLink!);
    await expect(staffPage.getByRole("heading", { name: "Activate Your Account" })).toBeVisible();
    await staffPage.getByLabel("Create Password").fill(PASSWORD);
    await staffPage.getByRole("button", { name: "Activate Account" }).click();
    await staffPage.waitForURL("**/app/onboarding", { timeout: 45_000 });
    await expect(staffPage.getByTestId("onboarding-welcome")).toContainText(owner.company);
    await expect(staffPage.getByText("Read the shop handbook")).toBeVisible();
    await staffPage.getByLabel("I've read this").click();
    await staffPage.getByTestId("onboarding-upload-input").setInputFiles({
      name: "photo-id.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
    });
    await expect(staffPage.getByText("photo-id.png")).toBeVisible({ timeout: 20_000 });
    await staffPage.getByTestId("onboarding-finish").click();
    await expect(staffPage.getByText("You're on the floor")).toBeVisible({ timeout: 20_000 });
    await staffPage.goto("/app/dashboard");
    await expect(staffPage.getByTestId("overview-employee-onboarding")).toHaveCount(0);
    await staffContext.close();
  });
});
