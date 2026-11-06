import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const ROLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa17";
const OPEN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb17";
const CLOSE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc17";

type CapturedForm = {
  id: string;
  title: string;
  settings: Record<string, unknown>;
  status: string;
};

type CapturedField = {
  id: string;
  form_id: string;
  label: string;
  field_order: number;
};

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

test("café starter adds a Barista role and opening and closing lists for My Shift", async ({
  page,
}) => {
  const forms: CapturedForm[] = [];
  const fields: CapturedField[] = [];
  let createdRole = false;
  let replay = false;
  const unexpected: string[] = [];

  page.on("request", (request) => {
    const method = request.method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
    const url = request.url();
    if (url.includes("/rest/v1/rpc/")) return;
    if (url.includes("/rest/v1/company_roles")) return;
    if (url.includes("/rest/v1/forms")) return;
    if (url.includes("/rest/v1/form_fields")) return;
    if (url.includes("/api/i18n/content-translations")) return;
    if (url.includes("/rest/v1/") || url.includes("/api/")) unexpected.push(`${method} ${url}`);
  });

  await page.route("**/api/i18n/content-translations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("**/rest/v1/company_roles*", async (route) => {
    await handleRoles(route, () => createdRole, (value) => {
      createdRole = value;
    }, () => replay);
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    await handleForms(route, forms, () => replay);
  });
  await page.route("**/rest/v1/form_fields*", async (route) => {
    await handleFields(route, forms, fields, () => replay);
  });
  await page.route("**/rest/v1/schedules*", async (route) => {
    await handleSchedules(route, page, () => replay);
  });

  await signIn(page);
  await page.goto("/app/forms");
  await expect(page.getByTestId("forms-page")).toBeVisible({ timeout: 30_000 });
  const starter = page.getByTestId("cafe-starter-button");
  await expect(starter).toBeVisible({ timeout: 20_000 });
  await starter.click();
  const dialog = page.getByTestId("cafe-starter-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("cafe-starter-role")).toContainText("Barista");
  await expect(page.getByTestId("cafe-list-opening")).toContainText("Opening list");
  await expect(page.getByTestId("cafe-list-closing")).toContainText("Closing list");
  await expect(page.getByTestId("cafe-item-opening-1")).toContainText("espresso machine");
  await expect(page.getByTestId("cafe-item-closing-5")).toContainText("lock up");
  await expect(page.getByTestId("cafe-show-from-opening")).toBeVisible();
  await expect(page.getByTestId("cafe-due-at-closing")).toBeVisible();
  await expect(page.getByTestId("cafe-starter-apply")).toBeVisible();
  await dialog.screenshot({ path: "/opt/cursor/artifacts/cafe-starter-dialog.png" });

  const showFrom = localInput(new Date(Date.now() - 60 * 60 * 1000));
  const dueAt = localInput(new Date(Date.now() + 4 * 60 * 60 * 1000));
  await page.getByTestId("cafe-show-from-opening").fill(showFrom);
  await page.getByTestId("cafe-due-at-opening").fill(dueAt);
  await page.getByTestId("cafe-show-from-closing").fill(showFrom);
  await page.getByTestId("cafe-due-at-closing").fill(dueAt);
  await page.getByTestId("cafe-starter-apply").click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  expect(forms).toHaveLength(2);
  expect(fields.length).toBeGreaterThanOrEqual(10);

  const roleIds = forms.flatMap((form) => roleIdsOf(form.settings));
  expect(new Set(roleIds).size).toBe(1);
  expect(roleIds[0]).toBeTruthy();
  for (const form of forms) {
    const distribution = distributionOf(form.settings);
    expect(distribution.record_kind).toBe("list");
    expect(distribution.show_from).toBeTruthy();
    expect(distribution.due_at).toBeTruthy();
    expect(new Date(String(distribution.due_at)).getTime()).toBeGreaterThan(
      new Date(String(distribution.show_from)).getTime(),
    );
    expect(form.settings.checklist).toBeUndefined();
    expect(form.settings.automation).toBeUndefined();
    const starter = form.settings.starter as { pack?: string; list?: string };
    expect(starter.pack).toBe("cafe");
    expect(["opening", "closing"]).toContain(starter.list);
  }
  expect(forms.map((form) => (form.settings.starter as { list: string }).list).sort()).toEqual([
    "closing",
    "opening",
  ]);
  if (createdRole) {
    expect(roleIds[0]).toBe(ROLE_ID);
  }
  expect(unexpected.filter((url) => /automation|workflow/i.test(url))).toEqual([]);

  replay = true;
  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-shift").click();
  for (const form of forms) {
    const list = page.getByTestId(`my-shift-role-list-${form.id}`);
    await expect(list).toBeVisible({ timeout: 20_000 });
    await expect(list).toContainText(form.title);
  }
  await page
    .getByTestId(`my-shift-role-list-${forms[0]?.id}`)
    .screenshot({ path: "/opt/cursor/artifacts/cafe-starter-my-shift.png" });
});

function localInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function distributionOf(settings: Record<string, unknown>): Record<string, unknown> {
  return asRecord(settings.distribution);
}

function roleIdsOf(settings: Record<string, unknown>): string[] {
  const ids = distributionOf(settings).role_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
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

async function handleRoles(
  route: Route,
  created: () => boolean,
  markCreated: (value: boolean) => void,
  replay: () => boolean,
) {
  const request = route.request();
  if (request.method() === "POST") {
    const body = asRecord(request.postDataJSON());
    expect(body.name).toBe("Barista");
    expect(body.product_level).toBe("staff");
    const permissions = asRecord(body.permissions);
    expect(permissions["forms.submit"]).toBe(true);
    expect(permissions.createForms).toBeUndefined();
    markCreated(true);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: ROLE_ID, ...body }),
    });
    return;
  }
  if (request.method() === "GET" && replay() && created()) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: ROLE_ID, name: "Barista" }]),
    });
    return;
  }
  if (request.method() === "GET" && replay() && !created()) {
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
    return;
  }
  await route.continue();
}

async function handleForms(
  route: Route,
  forms: CapturedForm[],
  replay: () => boolean,
) {
  const request = route.request();
  if (request.method() === "POST") {
    const body = asRecord(request.postDataJSON());
    const id = forms.length === 0 ? OPEN_ID : CLOSE_ID;
    const settings = asRecord(body.settings);
    const row = {
      id,
      company_id: typeof body.company_id === "string" ? body.company_id : null,
      title: typeof body.title === "string" ? body.title : "",
      description: typeof body.description === "string" ? body.description : null,
      status: typeof body.status === "string" ? body.status : "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: typeof body.created_by === "string" ? body.created_by : null,
      department_id: null,
      is_anonymous: false,
      max_submissions: null,
      settings,
      start_date: null,
      end_date: null,
    };
    forms.push({ id, title: row.title, settings, status: row.status });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(row),
    });
    return;
  }
  if (
    request.method() === "GET" &&
    replay() &&
    request.url().includes("settings") &&
    !request.url().includes("createdprofile")
  ) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        forms.map((form) => ({
          id: form.id,
          title: form.title,
          settings: form.settings,
          status: form.status,
        })),
      ),
    });
    return;
  }
  await route.continue();
}

async function handleFields(
  route: Route,
  forms: CapturedForm[],
  fields: CapturedField[],
  replay: () => boolean,
) {
  const request = route.request();
  if (request.method() === "POST") {
    const body = request.postDataJSON() as unknown;
    const rows = Array.isArray(body) ? body : [body];
    const created = rows.map((row, index) => {
      const record = asRecord(row);
      const formId =
        typeof record.form_id === "string" ? record.form_id : forms.at(-1)?.id ?? OPEN_ID;
      const field: CapturedField = {
        id: `${formId}-field-${fields.length + index + 1}`,
        form_id: formId,
        label: typeof record.label === "string" ? record.label : "",
        field_order: typeof record.field_order === "number" ? record.field_order : index + 1,
      };
      return field;
    });
    fields.push(...created);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(
        created.map((field) => ({
          id: field.id,
          label: field.label,
          description: null,
          placeholder: null,
          options: null,
        })),
      ),
    });
    return;
  }
  if (request.method() === "GET" && replay()) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fields),
    });
    return;
  }
  await route.continue();
}

async function handleSchedules(route: Route, page: Page, replay: () => boolean) {
  const request = route.request();
  if (!replay() || request.method() !== "GET" || !request.url().includes("is_template")) {
    await route.continue();
    return;
  }
  const userId = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(
      (name) => name.startsWith("sb-") && name.endsWith("-auth-token"),
    );
    if (!key) return "";
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { user?: { id?: string } };
    return parsed.user?.id ?? "";
  });
  const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddd17",
        role: "Barista",
        title: "Bar",
        start_time: start,
        end_time: end,
        user_id: userId,
        is_published: true,
        is_template: false,
        position_id: null,
      },
    ]),
  });
}
