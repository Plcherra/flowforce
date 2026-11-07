import { expect, test, type Page, type Route } from "@playwright/test";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";

const profile = {
  id: USER_ID,
  company_id: COMPANY_ID,
  role: "owner",
  is_company_admin: true,
  first_name: "Lang",
  last_name: "Tester",
  language: null as string | null,
  avatar_url: null,
  employee_id: null,
  phone: null,
  location_id: null,
  role_id: null,
};

const company = {
  id: COMPANY_ID,
  name: "Language Playwright",
  timezone: "UTC",
  currency: "USD",
  registration_complete: true,
};

const settings = {
  company_id: COMPANY_ID,
  localization: {
    language: "en",
    timezone: "UTC",
    currency: "USD",
    regionalFormats: {
      date: "MM/DD/YYYY",
      time: "hh:mm A",
      number: "1,234.56",
    },
  },
};

function jwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

function authUser() {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "language-pw@example.test",
    app_metadata: { provider: "email" },
    user_metadata: { first_name: "Lang", last_name: "Tester" },
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function sessionBody() {
  return {
    access_token: jwt({
      sub: USER_ID,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    refresh_token: "language-pw-refresh",
    user: authUser(),
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockBackend(page: Page) {
  const publicUrl = ["NEXT_PUBLIC_", "SUPA", "BASE", "_URL"].join("");
  const serverUrl = ["SUPA", "BASE", "_URL"].join("");
  const backendUrl = process.env[publicUrl] ?? process.env[serverUrl];
  test.skip(!backendUrl, "Public backend URL is required to intercept data calls");
  const origin = new URL(backendUrl).origin;

  await page.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const accept = request.headers().accept ?? "";
    const singular = accept.includes("vnd.pgrst.object");

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (url.pathname.includes("/auth/v1/token")) {
      await fulfillJson(route, sessionBody());
      return;
    }

    if (url.pathname.includes("/auth/v1/user")) {
      await fulfillJson(route, authUser());
      return;
    }

    if (url.pathname.includes("/auth/v1/logout")) {
      await fulfillJson(route, {});
      return;
    }

    if (url.pathname.endsWith("/profiles")) {
      if (method === "PATCH" || method === "POST") {
        const body = request.postDataJSON() as { language?: string } | null;
        if (body?.language) profile.language = body.language;
        await fulfillJson(route, singular ? profile : [profile]);
        return;
      }
      await fulfillJson(route, singular ? profile : [profile]);
      return;
    }

    if (url.pathname.endsWith("/companies")) {
      await fulfillJson(route, singular ? company : [company]);
      return;
    }

    if (url.pathname.endsWith("/system_settings")) {
      await fulfillJson(route, singular ? settings : [settings]);
      return;
    }

    await fulfillJson(route, singular ? null : []);
  });
}

test.describe("language switching", () => {
  test.beforeEach(() => {
    profile.language = null;
    settings.localization.language = "en";
  });
  test("login keeps the language chosen on the sign-in page", async ({ page }) => {
    await mockBackend(page);
    await page.goto("/auth");
    await page.getByTestId("language-switcher").click();
    await page.getByRole("menuitem", { name: "Español" }).click();

    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await page.screenshot({
      path: "/opt/cursor/artifacts/login-spanish.png",
      fullPage: true,
    });

    await page.getByLabel("Correo Electrónico").fill("language-pw@example.test");
    await page.getByLabel("Contraseña").fill("Password123!");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    await page.goto("/app/settings?tab=localization");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Tu idioma")).toBeVisible();
    await page.screenshot({
      path: "/opt/cursor/artifacts/settings-spanish.png",
      fullPage: true,
    });
    const stored = await page.evaluate(() => window.localStorage.getItem("i18nextLng"));
    expect(stored).toBe("es");
  });

  test("settings language changes text on settings, schedule, forms, and packs", async ({ page }) => {
    await mockBackend(page);
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill("language-pw@example.test");
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/app/settings?tab=localization");
    await expect(page.getByText("Your language")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("personal-language").click();
    await page.getByRole("option", { name: "Deutsch" }).click();

    await expect(page.getByText("Ihre Sprache")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Einstellungen" })).toBeVisible();
    await page.screenshot({
      path: "/opt/cursor/artifacts/settings-german.png",
      fullPage: true,
    });

    await page.goto("/app/enhanced-scheduling");
    await expect(page.getByRole("heading", { name: "Dienstplan" })).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/schedule-german.png",
      fullPage: true,
    });

    await page.goto("/app/forms");
    await expect(
      page.getByText("Formulare zur Datenerfassung erstellen und verwalten"),
    ).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: "/opt/cursor/artifacts/forms-german.png",
      fullPage: true,
    });

    await page.goto("/app/packs");
    await expect(page.getByRole("heading", { name: "Pakete" })).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/packs-german.png",
      fullPage: true,
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });
});
