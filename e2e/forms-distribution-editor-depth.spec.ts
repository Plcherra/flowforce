import { expect, test, type Page, type Route } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const OPEN_FORM_ID = "22222222-2222-4222-8222-222222222222";
const DISTRIBUTION_FORM_ID = "88888888-8888-4888-8888-888888888888";
const NEW_FORM_ID = "66666666-6666-4666-8666-666666666666";
const FIELD_ID = "f0000000-0000-4000-8000-000000000001";
const STORE_ALPHA_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const STORE_BETA_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const FIXTURE_DEPT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FIXTURE_ROLE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      return Array.isArray(json) ? json.map(pin) : pin(json);
    });
  });
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("multi-store list shows store picker and selection sticks on who step", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await pinTwoStores(page);
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-new-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("forms-new-button").click();
  await page.getByLabel("Form title").fill("E2E distribution stores");
  await page.getByRole("button", { name: "Create form" }).click();
  await expect(page.getByTestId("form-builder")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("form-builder-next").click();
  await page.getByTestId("form-builder-next").click();

  const editor = page.getByTestId("form-distribution");
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await editor.getByTestId("form-record-kind").click();
  await page.getByRole("option", { name: "List" }).click();

  await expect(page.getByTestId("form-store")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("form-store").click();
  await page.getByRole("option", { name: "E2E Store Beta" }).click();
  await page.getByTestId("form-show-time-toggle").click();
  await page.getByTestId("form-due-time-toggle").click();
  await page.getByTestId("form-builder-next").click();
  await expect(page.getByTestId("form-builder-step-preview")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByTestId("form-builder-nav-who").click();
  await expect(page.getByTestId("form-store")).toContainText("E2E Store Beta");
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-distribution-stores.png" });
});

test("specific people fill without selection blocks the preview step", async ({ page }) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-new-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("forms-new-button").click();
  await page.getByLabel("Form title").fill("E2E distribution incomplete");
  await page.getByRole("button", { name: "Create form" }).click();
  await expect(page.getByTestId("form-builder")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("form-builder-next").click();
  await page.getByTestId("form-builder-next").click();

  const editor = page.getByTestId("form-distribution");
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await editor.getByTestId("form-fill-audience").click();
  await page.getByRole("option", { name: "Specific people" }).click();
  await page.getByTestId("form-show-time-toggle").click();
  await page.getByTestId("form-due-time-toggle").click();
  await page.getByTestId("form-builder-next").click();
  await expect(
    page.getByText("Choose at least one person, position, role, or department.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("form-builder-step-who")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-distribution-incomplete.png" });
});

test("edit walks saved distribution: list, store, department fill, attached role", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await pinTwoStores(page);
  await pinFixtureDepartment(page);
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await search(page, "E2E saved distribution");
  await expect(page.getByTestId(`form-row-${DISTRIBUTION_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId(`form-edit-${DISTRIBUTION_FORM_ID}`).click();
  await expect(page.getByTestId("form-builder")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("form-builder-nav-who").click();
  await expect(page.getByTestId("form-distribution")).toBeVisible({ timeout: 20_000 });

  await expect(page.getByTestId("form-record-kind")).toHaveText("List");
  await expect(page.getByTestId("form-store")).toContainText("E2E Store Alpha");
  await expect(page.getByTestId(`form-attached-role-${FIXTURE_ROLE_ID}`)).toBeChecked();
  await expect(page.getByTestId("form-fill-audience")).toHaveText("A department");
  await expect(page.getByTestId(`form-fill-audience-${FIXTURE_DEPT_ID}`)).toBeChecked();
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-distribution-edit-loaded.png" });
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

async function search(page: Page, title: string) {
  await page.locator("#forms-search").fill(title);
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

function defaultHours() {
  return {
    monday: { closed: false, open: "08:00", close: "22:00" },
    tuesday: { closed: false, open: "08:00", close: "22:00" },
    wednesday: { closed: false, open: "08:00", close: "22:00" },
    thursday: { closed: false, open: "08:00", close: "22:00" },
    friday: { closed: false, open: "08:00", close: "22:00" },
    saturday: { closed: false, open: "08:00", close: "22:00" },
    sunday: { closed: false, open: "08:00", close: "22:00" },
  };
}

async function pinTwoStores(page: Page) {
  await page.route("**/rest/v1/stores*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? json : [];
      const sample = rows[0] as { company_id?: string } | undefined;
      const companyId =
        sample?.company_id ??
        new URL(request.url()).searchParams.get("company_id")?.replace(/^eq\./, "") ??
        "";
      const stamp = "2026-11-06T12:00:00.000Z";
      return [
        {
          id: STORE_ALPHA_ID,
          company_id: companyId,
          name: "E2E Store Alpha",
          address: "1 Alpha St",
          hours: defaultHours(),
          archived_at: null,
          created_at: stamp,
        },
        {
          id: STORE_BETA_ID,
          company_id: companyId,
          name: "E2E Store Beta",
          address: "2 Beta St",
          hours: defaultHours(),
          archived_at: null,
          created_at: stamp,
        },
      ];
    });
  });
}

async function pinFixtureDepartment(page: Page) {
  await page.route("**/rest/v1/departments*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? json : [];
      const sample = rows[0] as { company_id?: string } | undefined;
      const companyId =
        sample?.company_id ??
        new URL(request.url()).searchParams.get("company_id")?.replace(/^eq\./, "") ??
        "";
      const hasFixture = rows.some(
        (row) =>
          row &&
          typeof row === "object" &&
          (row as { id?: string }).id === FIXTURE_DEPT_ID,
      );
      if (hasFixture) return json;
      return [
        {
          id: FIXTURE_DEPT_ID,
          company_id: companyId,
          name: "E2E Fixture Department",
          created_at: "2026-11-06T12:00:00.000Z",
        },
        ...rows,
      ];
    });
  });
  await page.route("**/rest/v1/company_roles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const rows = Array.isArray(json) ? json : [];
      const sample = rows[0] as { company_id?: string } | undefined;
      const companyId =
        sample?.company_id ??
        new URL(request.url()).searchParams.get("company_id")?.replace(/^eq\./, "") ??
        "";
      const hasFixture = rows.some(
        (row) =>
          row &&
          typeof row === "object" &&
          (row as { id?: string }).id === FIXTURE_ROLE_ID,
      );
      if (hasFixture) return json;
      return [
        {
          id: FIXTURE_ROLE_ID,
          company_id: companyId,
          name: "E2E Fixture Role",
          created_at: "2026-11-06T12:00:00.000Z",
        },
        ...rows,
      ];
    });
  });
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
    if (
      !url.includes(OPEN_FORM_ID) &&
      !url.includes(DISTRIBUTION_FORM_ID) &&
      !url.includes(NEW_FORM_ID)
    ) {
      await route.continue();
      return;
    }
    if (url.includes(DISTRIBUTION_FORM_ID)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: FIELD_ID,
            form_id: DISTRIBUTION_FORM_ID,
            label: "E2E checklist",
            field_type: "short_text",
            is_required: false,
            field_order: 1,
            options: null,
            validation_rules: null,
          },
        ]),
      });
      return;
    }
    if (url.includes(NEW_FORM_ID) && !url.includes(OPEN_FORM_ID)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: FIELD_ID,
          form_id: OPEN_FORM_ID,
          label: "E2E notes",
          field_type: "short_text",
          is_required: false,
          field_order: 1,
          options: null,
          validation_rules: null,
        },
      ]),
    });
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    await blockFormWritesOnForms(route);
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

async function blockFormWritesOnForms(route: Route) {
  const method = route.request().method();
  if (method === "GET" || method === "HEAD") {
    await injectForms(route);
    return;
  }
  if (method === "POST") {
    let companyId = "";
    let createdBy = "99999999-9999-4999-8999-999999999999";
    let title = "E2E distribution draft";
    try {
      const body = route.request().postDataJSON() as {
        company_id?: string;
        created_by?: string;
        title?: string;
      } | null;
      companyId = body?.company_id ?? "";
      if (body?.created_by) createdBy = body.created_by;
      if (typeof body?.title === "string") title = body.title;
    } catch {
      companyId = "";
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: NEW_FORM_ID,
        company_id: companyId,
        title,
        description: null,
        status: "draft",
        created_at: "2026-11-22T12:00:00.000Z",
        updated_at: "2026-11-22T12:00:00.000Z",
        created_by: createdBy,
        department_id: null,
        is_anonymous: false,
        max_submissions: null,
        start_date: null,
        end_date: null,
        settings: { distribution: defaultDistribution() },
      }),
    });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([]),
  });
}

function defaultDistribution() {
  return {
    record_kind: "form",
    role_ids: [],
    fill_audience: companyAudience(),
    see_audience: companyAudience(),
    time_mode: "shift_day",
    show_at: "06:00",
    due_time: "22:00",
    complete_by: null,
    show_from: null,
    due_at: null,
    store_ids: [],
  };
}

async function injectForms(route: Route) {
  const request = route.request();
  const method = request.method();
  const url = request.url();
  if (!url.includes("createdprofile") && !url.includes("/forms")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  const companyFromQuery = new URL(url).searchParams.get("company_id")?.replace(/^eq\./, "");
  const sample = rows[0] as { company_id?: string } | undefined;
  const companyId = sample?.company_id ?? companyFromQuery ?? "";
  if (!companyId) {
    await route.fulfill({ response });
    return;
  }
  const stamp = "2026-11-06T12:00:00.000Z";
  const openForm = {
    id: OPEN_FORM_ID,
    company_id: companyId,
    title: "E2E open form",
    description: null,
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
  const distributionForm = {
    id: DISTRIBUTION_FORM_ID,
    company_id: companyId,
    title: "E2E saved distribution",
    description: null,
    status: "published",
    created_at: stamp,
    updated_at: stamp,
    created_by: "99999999-9999-4999-8999-999999999999",
    department_id: null,
    is_anonymous: false,
    max_submissions: null,
    settings: {
      distribution: {
        record_kind: "list",
        role_ids: [FIXTURE_ROLE_ID],
        store_ids: [STORE_ALPHA_ID],
        fill_audience: {
          kind: "department",
          user_ids: [],
          position_ids: [],
          role_ids: [],
          department_ids: [FIXTURE_DEPT_ID],
        },
        see_audience: companyAudience(),
        time_mode: "shift_day",
        show_at: "06:00",
        due_time: "10:00",
        complete_by: null,
        show_from: null,
        due_at: null,
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
  if (method === "GET" && url.includes(`id=eq.${DISTRIBUTION_FORM_ID}`)) {
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([distributionForm]),
    });
    return;
  }
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([distributionForm, openForm, ...rows]),
  });
}