import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const OPEN_FORM_ID = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_ID = "33333333-3333-4333-8333-333333333331";

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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("submissions dialog empty state and fill shortcut", async ({ page }) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await stubFormSubmissions(page, []);
  await signIn(page);

  await openSubmissionsDialog(page);
  await expect(page.getByTestId("form-submissions-empty")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("form-submissions-empty").getByRole("button", { name: "Fill Form" }),
  ).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-submissions-empty.png" });
});

test("submissions dialog lists rows and export without writes", async ({ page }) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await stubFormSubmissions(page, [
    {
      id: SUBMISSION_ID,
      form_id: OPEN_FORM_ID,
      submitted_at: "2026-11-06T12:00:00.000Z",
      submitted_by: "99999999-9999-4999-8999-999999999999",
      submissiondata: { "f0000000-0000-4000-8000-000000000001": "Checked stock" },
      submittedprofile: {
        first_name: "Floor",
        last_name: "Lead",
      },
    },
  ]);
  await signIn(page);

  await openSubmissionsDialog(page);
  await expect(page.getByTestId("form-submissions-list")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("form-submissions-export")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("form-submissions-export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^form-submissions-.*\.csv$/);
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-submissions-export.png" });
});

async function openSubmissionsDialog(page: Page) {
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await page.locator("#forms-search").fill("E2E open form");
  await expect(page.getByTestId(`form-row-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId(`form-submissions-${OPEN_FORM_ID}`).click();
  await expect(page.getByTestId("form-submissions-dialog")).toBeVisible({
    timeout: 30_000,
  });
}

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
    department_ids: [] as string[],
    role_ids: [] as string[],
  };
}

async function stubFormSubmissions(
  page: Page,
  submissions: Record<string, unknown>[],
) {
  const submissionCount = submissions.length;
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
    if (!request.url().includes(OPEN_FORM_ID)) {
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
  await page.route("**/rest/v1/form_submissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "blocked for e2e" }),
      });
      return;
    }
    if (!request.url().includes(OPEN_FORM_ID)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(submissions),
    });
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await injectOpenForm(route, submissionCount);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

async function blockFormWrites(page: Page) {
  for (const pattern of [
    "**/rest/v1/forms*",
    "**/rest/v1/form_fields*",
    "**/rest/v1/form_submissions*",
    "**/storage/v1/object/**",
  ]) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
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
}

async function injectOpenForm(route: Route, submissionCount: number) {
  const request = route.request();
  if (request.method() !== "GET" && request.method() !== "HEAD") {
    await route.continue();
    return;
  }
  const url = request.url();
  if (!url.includes("createdprofile") && !url.includes(`id=eq.${OPEN_FORM_ID}`)) {
    if (!(url.includes("/forms?") || url.includes("/forms&"))) {
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
    description: "Submissions depth fixture",
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
    submission_stats: [{ count: submissionCount }],
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
