import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Harbor!Meal9";
const stamp = Date.now();
const owner = {
  firstName: "Avery",
  lastName: "Cole",
  email:
    process.env.PLAYWRIGHT_OWNER_EMAIL ??
    `avery.cole.onboard.${stamp}@flowforce.uk`,
  company: `Harbor Coffee ${stamp}`,
};
const staff = {
  firstName: "Riley",
  lastName: "Quinn",
  email: `riley.quinn.onboard.${stamp}@flowforce.uk`,
};

test.describe.configure({ mode: "serial" });

async function fillOwnerSignup(page: Page) {
  await page.goto("/company-registration");
  await expect(page.getByRole("heading", { level: 1, name: "Sign up" })).toBeVisible();
  await page.getByLabel("First name").fill(owner.firstName);
  await page.getByLabel("Last name").fill(owner.lastName);
  await page.getByLabel("Email", { exact: true }).fill(owner.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByTestId("account-next").click();

  await expect(page.getByRole("heading", { level: 1, name: "Company basics" })).toBeVisible();
  await page.getByLabel("Company name").fill(owner.company);
  await page.getByTestId("account-next").click();

  await expect(page.getByRole("heading", { level: 1, name: "Departments and roles" })).toBeVisible();
  await page.getByTestId("account-next").click();

  await expect(page.getByRole("heading", { level: 1, name: "Permissions" })).toBeVisible();
  await page.getByTestId("account-next").click();

  await expect(page.getByRole("heading", { level: 1, name: "Store and hours" })).toBeVisible();
  await page.getByTestId("store-name").fill("High Street");
  await page.getByTestId("store-address").fill("1 High Street");
  await page.getByTestId("account-next").click();

  await expect(page.getByRole("heading", { level: 1, name: "Invite your team" })).toBeVisible();
  await page.getByTestId("account-skip").click();

  await expect(page.getByRole("heading", { level: 1, name: "First shift or starter lists" })).toBeVisible();
  await page.getByTestId("account-finish").click();
  const landed = await Promise.race([
    page.waitForURL("**/app/dashboard", { timeout: 90_000 }).then(() => "dashboard" as const),
    page.waitForURL("**/auth?**", { timeout: 90_000 }).then(() => "confirm" as const),
    page.getByText("We could not finish setup.").waitFor({ timeout: 90_000 }).then(() => "failed" as const),
    page.getByText(/confirm your email/i).waitFor({ timeout: 90_000 }).then(() => "confirm" as const),
  ]);
  if (landed === "failed") {
    throw new Error("Signup did not open the workspace.");
  }
  if (landed === "dashboard") return;
  const confirmFile = process.env.PLAYWRIGHT_EMAIL_CONFIRM_FILE;
  if (!confirmFile) {
    throw new Error("Signup is waiting for an email confirmation link.");
  }
  const started = Date.now();
  let link = "";
  while (Date.now() - started < 90_000) {
    try {
      link = (await readFile(confirmFile, "utf8")).trim();
    } catch {
      link = "";
    }
    if (link.startsWith("http")) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!link.startsWith("http")) {
    throw new Error("Signup is waiting for an email confirmation link.");
  }
  await page.goto(link);
  await page.waitForURL("**/app/dashboard", { timeout: 60_000 });
}

test.describe("Employee onboarding with separate users", () => {
  test.setTimeout(240_000);

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
    await inviteDialog.getByTestId("invite-role").click();
    await page.getByRole("option", { name: "Barista", exact: true }).click();
    await expect(inviteDialog.getByTestId("invite-role")).toContainText("Barista");
    await inviteDialog.getByTestId("invite-start-date").fill("2026-11-16");
    const department = inviteDialog.getByTestId("invite-department");
    if (await department.isVisible().catch(() => false)) {
      await department.click();
      await page.getByRole("option", { name: "FOH", exact: true }).click();
    }
    const location = inviteDialog.getByTestId("invite-location");
    if (await location.isVisible().catch(() => false)) {
      await location.click();
      await page.getByRole("option", { name: "High Street" }).click();
    }
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
    await expect(staffPage.getByTestId("onboarding-fact-start")).toContainText("2026");
    await expect(staffPage.getByTestId("onboarding-fact-role")).toContainText("Barista");
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
