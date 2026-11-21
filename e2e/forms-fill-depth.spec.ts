import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const OPEN_FORM_ID = "22222222-2222-4222-8222-222222222222";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || !request.url().includes("language")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const pin = (row: unknown) =>
      row && typeof row === "object"
        ? { ...(row as Record<string, unknown>), language: "en" }
        : row;
    const body = Array.isArray(json) ? json.map(pin) : pin(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
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

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("open form fill dialog shows field list without storing a submission", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await page.locator("#forms-search").fill("E2E open form");
  await expect(page.getByTestId(`form-fill-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId(`form-fill-${OPEN_FORM_ID}`).click();

  await expect(page.getByTestId("form-fill-list")).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole("button", { name: "Submit form" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();

  await page.getByRole("button", { name: "Submit form" }).click();
  await expect(
    page.getByText("Unable to submit", { exact: false }),
  ).toHaveCount(0);

  await page.screenshot({
    path: "/opt/cursor/artifacts/forms-fill-depth.png",
    fullPage: true,
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fforms");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

function companyAudience() {
  return {
    kind: "company",
    user_ids: [] as string[],
    position_ids: [] as string[],
    role_ids: [] as string[],
    department_ids: [] as string[],
  };
}

async function blockFormWrites(page: Page) {
  await page.route("**/rest/v1/form_fields*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    const url = request.url();
    if (!url.includes(OPEN_FORM_ID)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "f0000000-0000-4000-8000-000000000001",
          form_id: OPEN_FORM_ID,
          label: "E2E notes",
          field_type: "short_text",
          required: false,
          sort_order: 0,
          options: null,
          validation: null,
          settings: {},
        },
      ]),
    });
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await injectOpenForm(route);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  await page.route("**/rest/v1/form_submissions*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "blocked for e2e" }),
    });
  });
}

async function injectOpenForm(route: Route) {
  const request = route.request();
  if (request.method() !== "GET" && request.method() !== "HEAD") {
    await route.continue();
    return;
  }
  const url = request.url();
  if (!url.includes("createdprofile") && !url.includes(`id=eq.${OPEN_FORM_ID}`)) {
    if (url.includes("/forms?") || url.includes("/forms&")) {
      // list query
    } else {
      await route.continue();
      return;
    }
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  const companyFromQuery = new URL(url).searchParams.get("company_id")?.replace(/^eq\./, "");
  const sample = rows[0] as { company_id?: string } | undefined;
  const companyId = sample?.company_id ?? companyFromQuery ?? "";
  const stamp = "2026-11-06T12:00:00.000Z";
  const openForm = {
    id: OPEN_FORM_ID,
    company_id: companyId,
    title: "E2E open form",
    description: "Fill depth fixture",
    status: "published",
    created_at: stamp,
    updated_at: stamp,
    created_by: "99999999-9999-4999-8999-999999999999",
    department_id: null,
    is_anonymous: false,
    max_submissions: null,
    settings: {
      distribution: {
        record_kind: "form",
        role_ids: [],
        fill_audience: companyAudience(),
        see_audience: companyAudience(),
        show_from: "2020-01-01T00:00:00.000Z",
        due_at: "2099-01-01T00:00:00.000Z",
      },
    },
    start_date: null,
    end_date: null,
    createdprofile: {
      id: "99999999-9999-4999-8999-999999999999",
      first_name: "Other",
      last_name: "Person",
      company_id: companyId,
    },
    department: null,
    submission_stats: [{ count: 0 }],
    latest_submission: [],
  };
  if (url.includes(`id=eq.${OPEN_FORM_ID}`)) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(openForm),
    });
    return;
  }
  if (!companyId) {
    await route.fulfill({ response });
    return;
  }
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([openForm, ...rows]),
  });
}