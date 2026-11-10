import { expect, test, type Page } from "@playwright/test";

test.describe("company registration locale and permissions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "es");
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

    await page.goto("/company-registration");
    await expect(page.getByTestId("account-step-signup")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeVisible();

    await page.getByLabel("Nombre").fill("Ada");
    await page.getByLabel("Apellido").fill("Owner");
    await page.getByLabel("Correo").fill("ada.owner@example.com");
    await page.getByLabel("Contraseña").fill("correct-horse");
    await page.getByTestId("account-next").click();

    await expect(page.getByTestId("account-step-company")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Datos de la empresa" }),
    ).toBeVisible();
    const localeSelect = page.locator("#company-locale");
    await expect(localeSelect.locator("option")).toHaveCount(6);
    await expect(localeSelect.locator("option", { hasText: "Español" })).toHaveCount(1);
    await page.getByLabel("Nombre de la empresa").fill("Café Norte");
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
    await page.getByLabel("Nombre del local").fill("Rua");
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

  test("invite step stays skippable without persisting signup", async ({
    page,
  }) => {
    await reachInviteStep(page);
    await page.getByTestId("account-invite-open").click();
    await expect(page.getByTestId("invite-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("account-skip").click();
    await expect(page.getByTestId("account-step-starter")).toBeVisible();
  });
});

async function reachInviteStep(page: Page) {
  await page.goto("/company-registration");
  await expect(page.getByTestId("account-step-signup")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Nombre").fill("Ada");
  await page.getByLabel("Apellido").fill("Owner");
  await page.getByLabel("Correo").fill("ada.owner@example.com");
  await page.getByLabel("Contraseña").fill("correct-horse");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-company")).toBeVisible();
  await page.getByLabel("Nombre de la empresa").fill("Café Norte");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-departments")).toBeVisible();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-permissions")).toBeVisible();
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-store")).toBeVisible();
  await page.getByLabel("Nombre del local").fill("Rua");
  await page.getByTestId("account-next").click();
  await expect(page.getByTestId("account-step-invite")).toBeVisible();
}
