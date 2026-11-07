import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PAST_DUE_ID = "11111111-1111-4111-8111-111111111111";
const OPEN_ID = "22222222-2222-4222-8222-222222222222";
const NOT_YET_ID = "33333333-3333-4333-8333-333333333333";
const PEOPLE_ID = "44444444-4444-4444-8444-444444444444";
const DRAFT_ID = "55555555-5555-4555-8555-555555555555";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() !== "GET" || !url.includes("language")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const pin = (row: unknown) =>
      row && typeof row === "object" ? { ...(row as Record<string, unknown>), language: "en" } : row;
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

test("hides a form from fillers after its due time and before show-from", async ({
  page,
}) => {
  await page.route("**/rest/v1/forms*", async (route) => {
    await injectDistributionRows(route);
  });
  await signIn(page);
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("forms-new-button")).toBeVisible({ timeout: 20_000 });

  await search(page, "E2E past due list");
  await expect(page.getByTestId(`form-row-${PAST_DUE_ID}`)).toBeVisible();
  await expect(page.getByTestId(`form-fill-${PAST_DUE_ID}`)).toHaveCount(0);
  await expect(page.getByTestId(`form-submissions-${PAST_DUE_ID}`)).toBeVisible();
  await page.getByTestId(`form-row-${PAST_DUE_ID}`).screenshot({
    path: "/opt/cursor/artifacts/form-past-due-hidden.png",
  });

  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-fill-${OPEN_ID}`)).toBeVisible();
  await page.getByTestId(`form-row-${OPEN_ID}`).screenshot({
    path: "/opt/cursor/artifacts/form-open-fill.png",
  });

  await search(page, "E2E not yet");
  await expect(page.getByTestId(`form-row-${NOT_YET_ID}`)).toBeVisible();
  await expect(page.getByTestId(`form-fill-${NOT_YET_ID}`)).toHaveCount(0);

  await search(page, "E2E people only");
  await expect(page.getByTestId(`form-row-${PEOPLE_ID}`)).toBeVisible();
  await expect(page.getByTestId(`form-fill-${PEOPLE_ID}`)).toHaveCount(0);
});

test("saves roles, fill and see audiences, and due time without storing the form", async ({
  page,
}) => {
  let savedSettings: Record<string, unknown> | null = null;
  await page.route("**/rest/v1/forms*", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(draftRow(body)),
      });
      return;
    }
    if (method === "PATCH" || method === "PUT") {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (body.settings && typeof body.settings === "object") {
        savedSettings = body.settings as Record<string, unknown>;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...draftRow(body),
          ...body,
          id: DRAFT_ID,
        }),
      });
      return;
    }
    if (method === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.continue();
  });
  await page.route("**/rest/v1/form_fields*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as
        | Record<string, unknown>
        | Array<Record<string, unknown>>;
      const rows = Array.isArray(body) ? body : [body];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          rows.map((row, index) => ({
            id: `field-${index}`,
            label: row.label ?? "Text",
            description: row.description ?? null,
            placeholder: row.placeholder ?? null,
            options: row.options ?? null,
          })),
        ),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await signIn(page);
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-new-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("forms-new-button").click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#new-form-title").fill("E2E distribution draft");
  await createDialog.getByRole("button", { name: "Create form" }).click();

  await expect(page.getByTestId("form-builder-step-basics")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("form-builder-next").click();
  await expect(page.getByTestId("form-questions-empty")).toBeVisible();
  await page.getByTestId("form-add-question").click();
  await page.getByTestId("form-question-type-text").click();
  await expect(page.getByTestId("form-question-list")).toBeVisible();
  await page.getByTestId("form-builder-step-questions").screenshot({
    path: "/opt/cursor/artifacts/form-builder-questions.png",
  });
  await page.getByTestId("form-builder-next").click();

  const editor = page.getByTestId("form-distribution");
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await editor.getByTestId("form-record-kind").click();
  await page.getByRole("option", { name: "List" }).click();

  const roles = editor.getByTestId("form-attached-roles");
  await expect(roles).toBeVisible({ timeout: 20_000 });
  const firstRole = roles.locator('[data-testid^="form-attached-role-"]').first();
  await expect(firstRole).toBeVisible();
  const roleTestId = await firstRole.getAttribute("data-testid");
  const roleId = roleTestId?.replace("form-attached-role-", "") ?? "";
  expect(roleId.length).toBeGreaterThan(0);
  await firstRole.click();

  await editor.getByTestId("form-fill-audience").click();
  await page.getByRole("option", { name: "Specific people" }).click();
  const fillPerson = editor.locator('[data-testid^="form-fill-audience-"]').first();
  await expect(fillPerson).toBeVisible();
  const fillTestId = await fillPerson.getAttribute("data-testid");
  const fillUserId = fillTestId?.replace("form-fill-audience-", "") ?? "";
  await fillPerson.click();

  await editor.getByTestId("form-see-audience").click();
  await page.getByRole("option", { name: "A role" }).click();
  const seeRole = editor.locator(`[data-testid="form-see-audience-${roleId}"]`);
  await expect(seeRole).toBeVisible();
  await seeRole.click();

  await editor.getByTestId("form-show-time-toggle").click();
  await editor.getByTestId("form-show-time").fill("06:00");
  await editor.getByTestId("form-due-time-toggle").click();
  await editor.getByTestId("form-due-time").fill("08:00");
  await editor.getByTestId("form-complete-time-toggle").click();
  await editor.getByTestId("form-complete-time").fill("09:00");

  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.getByTestId("form-builder-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.getByTestId("form-builder").screenshot({
    path: "/opt/cursor/artifacts/form-builder-who.png",
  });
  await page.getByTestId("form-builder-next").click();
  await expect(page.getByTestId("form-builder-step-preview")).toBeVisible();
  await page.getByTestId("form-builder-step-preview").screenshot({
    path: "/opt/cursor/artifacts/form-builder-preview.png",
  });
  await page.getByTestId("form-builder-publish").click();

  await expect.poll(() => savedSettings).not.toBeNull();
  const distribution = savedSettings?.distribution as {
    record_kind?: string;
    role_ids?: string[];
    fill_audience?: { kind?: string; user_ids?: string[] };
    see_audience?: { kind?: string; role_ids?: string[] };
    time_mode?: string;
    show_at?: string | null;
    due_time?: string | null;
    complete_by?: string | null;
    show_from?: string | null;
    due_at?: string | null;
  };
  expect(distribution.record_kind).toBe("list");
  expect(distribution.role_ids).toContain(roleId);
  expect(distribution.fill_audience?.kind).toBe("people");
  expect(distribution.fill_audience?.user_ids).toContain(fillUserId);
  expect(distribution.see_audience?.kind).toBe("role");
  expect(distribution.see_audience?.role_ids).toContain(roleId);
  expect(distribution.time_mode).toBe("shift_day");
  expect(distribution.show_at).toBe("06:00");
  expect(distribution.due_time).toBe("08:00");
  expect(distribution.complete_by).toBe("09:00");
  expect(distribution.show_from).toBeNull();
  expect(distribution.due_at).toBeNull();
});

async function search(page: Page, title: string) {
  await page.locator("#forms-search").fill(title);
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
    role_ids: [] as string[],
    department_ids: [] as string[],
  };
}

function syntheticForm(input: {
  id: string;
  companyId: string;
  title: string;
  settings: Record<string, unknown>;
}) {
  const stamp = "2026-11-06T12:00:00.000Z";
  return {
    id: input.id,
    company_id: input.companyId,
    title: input.title,
    description: null,
    status: "published",
    created_at: stamp,
    updated_at: stamp,
    created_by: "99999999-9999-4999-8999-999999999999",
    department_id: null,
    is_anonymous: false,
    max_submissions: null,
    settings: input.settings,
    start_date: null,
    end_date: null,
    createdprofile: {
      id: "99999999-9999-4999-8999-999999999999",
      first_name: "Other",
      last_name: "Person",
      company_id: input.companyId,
    },
    department: null,
    submission_stats: [{ count: 0 }],
    latest_submission: [],
  };
}

async function injectDistributionRows(route: Route) {
  const request = route.request();
  if (request.method() !== "GET" && request.method() !== "HEAD") {
    await route.continue();
    return;
  }
  const url = request.url();
  if (!url.includes("createdprofile")) {
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
  const extras = [
    syntheticForm({
      id: PAST_DUE_ID,
      companyId,
      title: "E2E past due list",
      settings: {
        distribution: {
          record_kind: "list",
          role_ids: [],
          fill_audience: companyAudience(),
          see_audience: companyAudience(),
          show_from: null,
          due_at: "2020-01-01T00:00:00.000Z",
        },
      },
    }),
    syntheticForm({
      id: OPEN_ID,
      companyId,
      title: "E2E open form",
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
    }),
    syntheticForm({
      id: NOT_YET_ID,
      companyId,
      title: "E2E not yet",
      settings: {
        distribution: {
          record_kind: "form",
          role_ids: [],
          fill_audience: companyAudience(),
          see_audience: companyAudience(),
          show_from: "2099-01-01T00:00:00.000Z",
          due_at: "2099-01-02T00:00:00.000Z",
        },
      },
    }),
    syntheticForm({
      id: PEOPLE_ID,
      companyId,
      title: "E2E people only",
      settings: {
        distribution: {
          record_kind: "form",
          role_ids: [],
          fill_audience: {
            kind: "people",
            user_ids: ["88888888-8888-4888-8888-888888888888"],
            position_ids: [],
            role_ids: [],
            department_ids: [],
          },
          see_audience: companyAudience(),
          show_from: null,
          due_at: "2099-01-01T00:00:00.000Z",
        },
      },
    }),
  ];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([...extras, ...rows]),
  });
}

function draftRow(body: Record<string, unknown>) {
  const stamp = new Date().toISOString();
  return {
    id: DRAFT_ID,
    company_id: body.company_id ?? null,
    title: body.title ?? "E2E distribution draft",
    description: body.description ?? null,
    status: body.status ?? "draft",
    created_at: stamp,
    updated_at: stamp,
    created_by: body.created_by ?? null,
    department_id: body.department_id ?? null,
    is_anonymous: body.is_anonymous ?? false,
    max_submissions: body.max_submissions ?? null,
    settings: body.settings ?? {},
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
  };
}
