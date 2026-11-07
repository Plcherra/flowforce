import { expect, test } from "@playwright/test";

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({
    path: `/opt/cursor/artifacts/${name}.png`,
    fullPage: true,
  });
}

test.describe("Employee onboarding screens", () => {
  test("shows the new hire welcome, checklist, and file step", async ({ page }) => {
    await page.goto("/onboarding-preview?screen=employee");
    await expect(page.getByTestId("employee-onboarding")).toBeVisible();
    await expect(page.getByTestId("onboarding-welcome")).toContainText("Harbor Coffee");
    await expect(page.getByTestId("onboarding-fact-role")).toContainText("Barista");
    await expect(page.getByTestId("onboarding-fact-department")).toContainText("Bar");
    await expect(page.getByTestId("onboarding-fact-store")).toContainText("High Street");
    await expect(page.getByTestId("onboarding-fact-start")).toContainText("2026");
    await expect(page.getByText("Read the shop handbook")).toBeVisible();
    await expect(page.getByText("I've read this")).toBeVisible();
    await expect(page.getByTestId("onboarding-upload-input")).toBeVisible();
    await expect(page.getByTestId("onboarding-finish")).toBeDisabled();
    await shot(page, "onboarding-employee");
  });

  test("shows the new hire welcome on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/onboarding-preview?screen=employee");
    await expect(page.getByTestId("onboarding-fact-store")).toContainText("High Street");
    await shot(page, "onboarding-employee-mobile");
  });

  test("shows onboarding on Overview until it is finished", async ({ page }) => {
    await page.goto("/onboarding-preview?screen=overview");
    const card = page.getByTestId("overview-employee-onboarding");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Harbor Coffee");
    await expect(card.getByRole("button", { name: "Continue onboarding" })).toBeVisible();
    await shot(page, "onboarding-overview");
  });

  test("lets an owner manage the welcome, shop documents, and steps", async ({ page }) => {
    await page.goto("/onboarding-preview?screen=settings");
    await expect(page.getByTestId("onboarding-settings")).toBeVisible();
    await expect(page.getByLabel("Welcome title")).toHaveValue("Welcome to Harbor Coffee");
    await expect(page.getByText("Shop handbook").first()).toBeVisible();
    await expect(page.getByLabel("Step title")).toBeVisible();
    await expect(page.getByText("Riley Quinn")).toBeVisible();
    await shot(page, "onboarding-settings");
  });
});
