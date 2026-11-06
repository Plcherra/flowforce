import { expect, test, type Page, type Route } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const ROLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLOSER_ROLE_ID = "99999999-9999-4999-8999-999999999992";
const OPEN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PAST_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LATER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const DRAFT_FORM_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const SLOT_ID = "12121212-1212-4121-8121-121212121212";
const SHIFT_ID = "34343434-3434-4343-8343-343434343434";
const DRAFT_SHIFT_ID = "56565656-5656-4565-8565-565656565656";
const FIELD_ID = "78787878-7878-4787-8787-787878787878";
const ROLE_NAME = "E2E Barista";

const gate = { denySubmit: false, denySchedule: false };

test.beforeEach(async ({ page }) => {
  gate.denySubmit = false;
  gate.denySchedule = false;
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

test("shows the published shift's open role list and hides the rest", async ({ page }) => {
  await signIn(page);
  const userId = await signedInUserId(page);
  await installReads(page, userId);
  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("tasks-mode-shift")).toBeVisible();

  const openList = page.getByTestId(`my-shift-list-${OPEN_ID}`);
  await expect(openList).toBeVisible({ timeout: 20_000 });
  await expect(openList).toContainText("E2E open bar list");
  await expect(openList.getByTestId(`my-shift-due-${OPEN_ID}`)).toContainText("Due");
  await expect(page.getByTestId(`my-shift-item-${FIELD_ID}`)).toBeVisible();
  await expect(page.getByTestId(`my-shift-open-${OPEN_ID}`)).toBeVisible();
  await expect(page.getByText("E2E past bar list")).toHaveCount(0);
  await expect(page.getByText("E2E later bar list")).toHaveCount(0);
  await expect(page.getByText("E2E other role list")).toHaveCount(0);
  await expect(page.getByText("E2E draft bar list")).toHaveCount(0);
  await expect(page.getByText("E2E opening slot")).toHaveCount(0);
  await expect(page.getByText("E2E closer list")).toHaveCount(0);
  await expect(page.locator("[data-testid^='my-shift-list-opening']")).toHaveCount(0);
  await openList.screenshot({ path: "/opt/cursor/artifacts/my-shift-role-list.png" });

  gate.denySubmit = true;
  await page.reload();
  await expect(page.getByTestId(`my-shift-list-${OPEN_ID}`)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId(`my-shift-open-${OPEN_ID}`)).toHaveCount(0);
  await expect(page.getByTestId(`my-shift-item-${FIELD_ID}`)).toHaveCount(0);
  await expect(page.getByTestId(`my-shift-item-readonly-${FIELD_ID}`)).toBeVisible();
  await page.getByTestId(`my-shift-list-${OPEN_ID}`).screenshot({
    path: "/opt/cursor/artifacts/my-shift-fill-denied.png",
  });

  gate.denySchedule = true;
  await page.reload();
  await expect(page.getByTestId("my-shift-schedule-denied")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId(`my-shift-list-${OPEN_ID}`)).toHaveCount(0);
  await page.getByTestId("my-shift-schedule-denied").screenshot({
    path: "/opt/cursor/artifacts/my-shift-schedule-denied.png",
  });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function signedInUserId(page: Page): Promise<string> {
  const id = await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.includes("auth-token")) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as {
          user?: { id?: string };
          currentSession?: { user?: { id?: string } };
        };
        const userId = parsed.user?.id ?? parsed.currentSession?.user?.id;
        if (typeof userId === "string" && userId.length > 0) return userId;
      } catch {
        // The next key may be the session.
      }
    }
    return "";
  });
  expect(id.length).toBeGreaterThan(0);
  return id;
}

async function installReads(page: Page, userId: string) {
  await page.route("**/rest/v1/company_roles*", async (route) => {
    await prependRows(route, [baristaRole(), closerRole()]);
  });
  await page.route("**/rest/v1/schedules*", async (route) => {
    if (route.request().method() !== "GET" && route.request().method() !== "HEAD") {
      await route.fulfill({ status: 409, contentType: "application/json", body: "[]" });
      return;
    }
    await prependRows(route, [publishedShift(userId), draftShift(userId)]);
  });
  await page.route("**/rest/v1/forms*", async (route) => {
    if (route.request().method() !== "GET" && route.request().method() !== "HEAD") {
      await route.fulfill({ status: 409, contentType: "application/json", body: "[]" });
      return;
    }
    await prependRows(route, syntheticForms());
  });
  await page.route("**/rest/v1/form_fields*", async (route) => {
    if (route.request().method() !== "GET" && route.request().method() !== "HEAD") {
      await route.fulfill({ status: 409, contentType: "application/json", body: "[]" });
      return;
    }
    await prependRows(route, [
      { id: FIELD_ID, form_id: OPEN_ID, label: "Wipe the bar", field_order: 1 },
    ]);
  });
  await page.route("**/rest/v1/form_submissions*", async (route) => {
    if (route.request().method() === "GET" || route.request().method() === "HEAD") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 409, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    if (route.request().method() !== "GET" && route.request().method() !== "HEAD") {
      await route.continue();
      return;
    }
    const extra = [];
    if (gate.denySubmit) extra.push(denyRow(userId, "forms.submit"));
    if (gate.denySchedule) extra.push(denyRow(userId, "viewOwnSchedules"));
    await prependRows(route, extra);
  });
}

async function prependRows(route: Route, extra: unknown[]) {
  if (route.request().method() === "HEAD") {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  if (!response.ok) {
    if (extra.length === 0) {
      await route.fulfill({ response });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(extra),
    });
    return;
  }
  const json = (await response.json()) as unknown;
  const rows = Array.isArray(json) ? json : [];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([...extra, ...rows]),
  });
}

function roleRow(id: string, name: string) {
  return {
    id,
    name,
    is_active: true,
    is_system_role: false,
    product_level: "staff",
    hierarchy_level: 1,
    permissions: {},
  };
}

function baristaRole() {
  return roleRow(ROLE_ID, ROLE_NAME);
}

function closerRole() {
  return roleRow(CLOSER_ROLE_ID, "E2E Closer");
}

function publishedShift(userId: string) {
  const start = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  return {
    id: SHIFT_ID,
    role: ROLE_NAME,
    title: "E2E Barista shift",
    start_time: start,
    end_time: end,
    user_id: userId,
    is_published: true,
    is_template: false,
  };
}

function draftShift(userId: string) {
  const start = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  return {
    id: DRAFT_SHIFT_ID,
    role: "E2E Closer",
    title: "E2E draft closer",
    start_time: start,
    end_time: end,
    user_id: userId,
    is_published: false,
    is_template: false,
  };
}

function audience() {
  return {
    kind: "company",
    user_ids: [] as string[],
    position_ids: [] as string[],
    role_ids: [] as string[],
    department_ids: [] as string[],
  };
}

function formRow(
  id: string,
  title: string,
  status: string,
  settings: Record<string, unknown>,
) {
  return { id, title, status, settings };
}

function distribution(
  roleIds: string[],
  showFrom: string | null,
  dueAt: string | null,
) {
  return {
    distribution: {
      record_kind: "list",
      role_ids: roleIds,
      fill_audience: audience(),
      see_audience: audience(),
      show_from: showFrom,
      due_at: dueAt,
    },
  };
}

function syntheticForms() {
  return [
    formRow(
      OPEN_ID,
      "E2E open bar list",
      "published",
      distribution([ROLE_ID], "2020-01-01T00:00:00.000Z", "2099-01-01T00:00:00.000Z"),
    ),
    formRow(
      PAST_ID,
      "E2E past bar list",
      "published",
      distribution([ROLE_ID], null, "2020-01-01T00:00:00.000Z"),
    ),
    formRow(
      LATER_ID,
      "E2E later bar list",
      "published",
      distribution([ROLE_ID], "2099-01-01T00:00:00.000Z", "2099-01-02T00:00:00.000Z"),
    ),
    formRow(
      OTHER_ID,
      "E2E other role list",
      "published",
      distribution(
        ["99999999-9999-4999-8999-999999999991"],
        null,
        "2099-01-01T00:00:00.000Z",
      ),
    ),
    formRow(
      DRAFT_FORM_ID,
      "E2E draft bar list",
      "draft",
      distribution([ROLE_ID], null, "2099-01-01T00:00:00.000Z"),
    ),
    formRow(SLOT_ID, "E2E opening slot", "published", {
      checklist: { area: "cashier", slot: "opening" },
    }),
    formRow(
      "abababab-abab-4aba-8aba-abababababab",
      "E2E closer list",
      "published",
      distribution([CLOSER_ROLE_ID], null, "2099-01-01T00:00:00.000Z"),
    ),
  ];
}

function denyRow(userId: string, key: string) {
  const stamp = new Date().toISOString();
  return {
    id: `e2e-deny-${key}`,
    user_id: userId,
    permission_key: key,
    permission_value: "deny",
    created_at: stamp,
    updated_at: stamp,
  };
}
