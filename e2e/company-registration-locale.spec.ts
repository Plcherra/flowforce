import { expect, test, type Page } from "@playwright/test";

test.describe("company registration locale and permissions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "es");
      document.cookie = "i18nextLng=es; path=/";
    });
  });

  test("signup wizard shows Spanish copy on every step through starter", async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() !== "GET" &&
        request.url().includes("/api/onboarding/complete")
      ) {
        writes.push(request.method());
      }
    });

    await openSpanishRegistration(page);
    await expect(
      page.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeVisible();

    await page.locator("#signup-first-name").fill("Ada");
    await page.locator("#signup-last-name").fill("Owner");
    await page.locator("#signup-email").fill("ada.owner@example.com");
    await page.locator("#signup-password").fill("correct-horse");
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-company")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Datos de la empresa" }),
    ).toBeVisible();
    const localeSelect = page.locator("#company-locale");
    await expect(localeSelect.locator("option")).toHaveCount(6);
    await expect(localeSelect.locator("option", { hasText: "Español" })).toHaveCount(1);
    await page.locator("#company-name").fill("Café Norte");
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-departments")).toBeVisible();
    await expect(page.getByTestId("org-start-template")).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-permissions")).toBeVisible();
    await expect(page.getByTestId("org-permissions")).toBeVisible();
    await expect(page.getByTestId("role-lead-schedule.edit")).toBeChecked();
    await expect(page.getByTestId("role-barista-schedule.edit")).not.toBeChecked();
    await expect(page.getByTestId("role-baker-forms.submit")).toBeChecked();
    await expect(page.getByTestId("role-manager-schedule.edit")).toBeChecked();
    await page.screenshot({
      path: "/opt/cursor/artifacts/company-registration-permissions-es.png",
      fullPage: true,
    });
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-store")).toBeVisible();
    await page.getByTestId("store-name").fill("Rua");
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-invite")).toBeVisible();
    await page.getByTestId("account-skip").click();

    await expect(page.getByTestId("account-step-starter")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Primer turno o listas iniciales" }),
    ).toBeVisible();
    await expect(page.getByTestId("account-starter-lists")).toBeChecked();
    await expect(page.getByLabel("Nombre de la lista").first()).toHaveValue(
      "Lista de apertura",
    );
    await page.screenshot({
      path: "/opt/cursor/artifacts/company-registration-starter-es.png",
      fullPage: true,
    });
    await expect(page.getByTestId("account-finish")).toBeVisible();
    expect(writes).toEqual([]);
  });
});

async function openSpanishRegistration(page: Page) {
  await page.goto("/company-registration");
  await page.evaluate(() => {
    window.localStorage.setItem("i18nextLng", "es");
    document.cookie = "i18nextLng=es; path=/";
  });
  await page.reload();
  await expect(page.getByTestId("account-step-signup")).toBeVisible({
    timeout: 30_000,
  });
}
