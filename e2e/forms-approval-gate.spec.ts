import { expect, test, type Page, type Route } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
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
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("approveFormSubmissions alone opens submissions without read or manage", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await pinStaffRole(page);
  await stripRoleSubmissionKeys(page);
  await patchPermissions(page, ["approveFormSubmissions"], "allow");
  await signIn(page);
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-row-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId(`form-submissions-${OPEN_FORM_ID}`)).toBeVisible();
  await page.getByTestId(`form-submissions-${OPEN_FORM_ID}`).click();
  await expect(page.getByTestId("form-submissions-dialog")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: "/opt/cursor/artifacts/forms-approval-gate-approve-only.png",
  });
});

test("deny override on submissions read hides team submissions even with approve", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockFormWrites(page);
  await signIn(page);

  await patchPermissions(
    page,
    ["forms.submissions.read", "approveFormSubmissions", "manageForms"],
    (key) => {
      if (key === "forms.submissions.read") return "deny";
      if (key === "approveFormSubmissions") return "allow";
      return "deny";
    },
  );
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  await search(page, "E2E open form");
  await expect(page.getByTestId(`form-row-${OPEN_FORM_ID}`)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId(`form-submissions-${OPEN_FORM_ID}`)).toHaveCount(0);
  await page.screenshot({
    path: "/opt/cursor/artifacts/forms-approval-gate-deny-override.png",
  });
});

async function stripRoleSubmissionKeys(page: Page) {
  await page.route("**/rest/v1/company_roles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const strip = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const record = row as { permissions?: Record<string, unknown> };
        const permissions = { ...(record.permissions ?? {}) };
        delete permissions["forms.submissions.read"];
        delete permissions["approveFormSubmissions"];
        delete permissions["manageForms"];
        delete permissions["createForms"];
        return { ...record, permissions };
      };
      return Array.isArray(json) ? json.map(strip) : strip(json);
    });
  });
}

async function pinStaffRole(page: Page) {
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const demote = (row: unknown) => {
      if (!row || typeof row !== "object") return row;
      return {
        ...(row as Record<string, unknown>),
        role: "staff",
        language: "en",
      };
    };
    const body = Array.isArray(json) ? json.map(demote) : demote(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
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

async function search(page: Page, title: string) {
  await page.locator("#forms-search").fill(title);
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

async function blockFormWrites(page: Page) {
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
}

async function injectOpenForm(route: Route) {
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

async function patchPermissions(
  page: Page,
  keys: readonly string[],
  value: "deny" | "allow" | ((key: string) => "deny" | "allow"),
) {
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
      permission_value: typeof value === "function" ? value(key) : value,
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}