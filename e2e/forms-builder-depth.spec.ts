import { expect, test, type Page, type Route } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const OPEN_FORM_ID = "22222222-2222-4222-8222-222222222222";
const NEW_FORM_ID = "66666666-6666-4666-8666-666666666666";
const FIELD_ID = "f0000000-0000-4000-8000-000000000001";
const MANAGE_CREATE_KEYS = ["createForms", "manageForms"] as const;

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

test("edit published form walks builder steps with fields and blocks publish write", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let publishAttempted = false;
  await blockFormWrites(page, () => {
    publishAttempted = true;
  });
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-row-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId(`form-edit-${OPEN_FORM_ID}`).click();
  await expect(page.getByTestId("form-builder")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("form-builder-step-basics")).toBeVisible();

  await expect(page.getByLabel("Form title")).toHaveValue("E2E open form");

  await page.getByTestId("form-builder-next").click();
  await expect(page.getByTestId("form-builder-step-questions")).toBeVisible();
  await expect(page.getByTestId(`form-question-${FIELD_ID}`)).toBeVisible({
    timeout: 20_000,
  });

  await page.getByTestId("form-builder-nav-who").click();
  await expect(page.getByTestId("form-builder-step-who")).toBeVisible();
  await expect(page.getByTestId("form-distribution")).toBeVisible();
  await page.getByTestId("form-complete-time-toggle").click();
  await page.getByTestId("form-builder-nav-preview").click();
  await expect(page.getByTestId("form-builder-step-preview")).toBeVisible();

  await page.getByTestId("form-builder-publish").click();
  await expect.poll(() => publishAttempted, { timeout: 15_000 }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-builder-edit-depth.png" });
});

test("new form button opens empty questions step", async ({ page }) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await signIn(page);

  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-new-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("forms-new-button").click();
  await expect(page.getByRole("heading", { name: "Create New Form" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByLabel("Form title").fill("E2E builder draft");
  await page.getByRole("button", { name: "Create form" }).click();
  await expect(page.getByTestId("form-builder")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("form-builder-step-basics")).toBeVisible();
  await page.getByTestId("form-builder-next").click();
  await expect(page.getByTestId("form-questions-empty")).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-builder-new-empty.png" });
});

test("createForms and manageForms gate edit and new form", async ({ page }) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await signIn(page);

  await page.goto("/app/forms");
  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-edit-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });

  await denyKeys(page, MANAGE_CREATE_KEYS);
  await page.reload();
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("forms-new-button")).toHaveCount(0);
  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-edit-${OPEN_FORM_ID}`)).toHaveCount(0);
  await expect(page.getByTestId(`form-fill-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "/opt/cursor/artifacts/forms-builder-gated.png" });
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

async function blockFormWrites(page: Page, onFormWrite?: () => void) {
  await page.unroute("**/rest/v1/forms*").catch(() => undefined);
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
    if (!url.includes(OPEN_FORM_ID) && !url.includes(NEW_FORM_ID)) {
      await route.continue();
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
    const method = route.request().method();
    if (method !== "GET" && method !== "HEAD") {
      onFormWrite?.();
    }
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
    await injectOpenForm(route);
    return;
  }
  if (method === "POST") {
    let companyId = "";
    let createdBy = "99999999-9999-4999-8999-999999999999";
    let title = "E2E builder draft";
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

async function injectOpenForm(route: Route) {
  const request = route.request();
  if (request.method() !== "GET" && request.method() !== "HEAD") {
    await route.continue();
    return;
  }
  const url = request.url();
  if (!url.includes("createdprofile") && !url.includes(`id=eq.${OPEN_FORM_ID}`)) {
    if (!url.includes("/forms?") && !url.includes("/forms&")) {
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
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([openForm, ...rows]),
  });
}

async function denyKeys(page: Page, keys: readonly string[]) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !keys.includes(key);
    });
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}